import { computed, ref, watch } from "vue";
import en from "../lang/en";
import ar from "../lang/ar";

export function createMeaningLockStore() {
    /*
    |--------------------------------------------------------------------------
    | Language
    |--------------------------------------------------------------------------
    */

    const locale = ref(localStorage.getItem("meaninglock_locale") || "en");

    const messages = {
        en,
        ar,
    };

    const isArabic = computed(() => {
        return locale.value === "ar";
    });

    function t(key) {
        return messages[locale.value]?.[key] ?? key;
    }

    function applyDocumentLanguage() {
        document.documentElement.lang = locale.value;

        document.documentElement.dir = isArabic.value ? "rtl" : "ltr";
    }

    function changeLanguage(language) {
        locale.value = language;

        localStorage.setItem("meaninglock_locale", language);

        applyDocumentLanguage();
    }

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const status = ref("ready");

    const transcriptTurns = ref([]);

    const partialTranscript = ref("");

    const currentSpeaker = ref("A");

    const speakerA = ref({});

    const speakerB = ref({});

    const confirmations = ref({
        A: false,
        B: false,
    });

    const timeline = ref([]);

    const clarificationMessage = ref("");

    const lastAutoPromptSignature = ref("");

    /*
    |--------------------------------------------------------------------------
    | Saved verified agreement
    |--------------------------------------------------------------------------
    */

    const savedAgreement = ref(null);
    const savingAgreement = ref(false);
    const saveAgreementError = ref("");
    const shareCopied = ref(false);

    /*
    |--------------------------------------------------------------------------
    | Agreements workspace
    |--------------------------------------------------------------------------
    */

    const currentPage = ref("live");
    const agreements = ref([]);
    const loadingAgreements = ref(false);
    const agreementsError = ref("");
    const selectedAgreement = ref(null);
    const loadingAgreement = ref(false);
    const agreementSearch = ref("");
    const agreementStatusFilter = ref("all");
    const copiedAgreementId = ref(null);

    /*
    |--------------------------------------------------------------------------
    | Activity workspace
    |--------------------------------------------------------------------------
    */

    const activitySearch = ref("");
    const activityFilter = ref("all");

    /*
    |--------------------------------------------------------------------------
    | Reports workspace
    |--------------------------------------------------------------------------
    */

    const reportRange = ref("all");

    /*
    |--------------------------------------------------------------------------
    | NEW
    |--------------------------------------------------------------------------
    |
    | While MeaningLock is speaking we stop sending microphone audio
    | to AssemblyAI.
    |
    */

    const isAiSpeaking = ref(false);

    let socket = null;

    let audioContext = null;

    let mediaStream = null;

    let source = null;

    let processor = null;

    /*
    |--------------------------------------------------------------------------
    | Agreement fields
    |--------------------------------------------------------------------------
    */


    const fields = ["price", "quantity", "date", "installation"];

    /*
    |--------------------------------------------------------------------------
    | Persistent settings
    |--------------------------------------------------------------------------
    */

    const SETTINGS_STORAGE_KEY = "meaninglock_settings_v1";

    const defaultSettings = {
        requiredTerms: {
            price: true,
            quantity: true,
            date: true,
            installation: true,
        },
        autoClarification: true,
        autoSaveVerified: true,
        aiVoice: true,
        voiceLanguage: "auto",
        speechRate: 0.95,
        noiseFiltering: true,
        ignoreShortPhrases: true,
        minimumWords: 4,
    };

    function loadSettings() {
        try {
            const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");

            if (!stored || typeof stored !== "object") {
                return structuredClone(defaultSettings);
            }

            return {
                ...structuredClone(defaultSettings),
                ...stored,
                requiredTerms: {
                    ...defaultSettings.requiredTerms,
                    ...(stored.requiredTerms ?? {}),
                },
            };
        } catch {
            return structuredClone(defaultSettings);
        }
    }

    const settings = ref(loadSettings());

    watch(
        settings,
        (value) => {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
        },
        { deep: true },
    );

    const requiredFields = computed(() => {
        const selected = fields.filter((field) => settings.value.requiredTerms?.[field]);
        return selected.length ? selected : ["price"];
    });

    watch(
        () => settings.value.requiredTerms,
        (terms) => {
            if (!fields.some((field) => terms?.[field])) {
                settings.value.requiredTerms.price = true;
            }
        },
        { deep: true },
    );

    function resetSettings() {
        settings.value = structuredClone(defaultSettings);
    }

    function initializeApp() {
        applyDocumentLanguage();
    }


    /*
    |--------------------------------------------------------------------------
    | Agreements workspace helpers
    |--------------------------------------------------------------------------
    */

    const filteredAgreements = computed(() => {
        const query = agreementSearch.value.trim().toLowerCase();

        return agreements.value.filter((agreement) => {
            const matchesStatus =
                agreementStatusFilter.value === "all" ||
                String(agreement.status ?? "").toLowerCase() ===
                    agreementStatusFilter.value;

            if (!matchesStatus) {
                return false;
            }

            if (!query) {
                return true;
            }

            const haystack = [
                agreementReference(agreement),
                agreement.public_id,
                agreement.status,
                agreement.price,
                agreement.quantity,
                agreement.delivery_date,
                agreement.installation,
            ]
                .filter((value) => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return haystack.includes(query);
        });
    });

    const verifiedAgreementsCount = computed(() => {
        return agreements.value.filter(
            (agreement) => String(agreement.status).toLowerCase() === "verified",
        ).length;
    });

    const agreementsTotalValue = computed(() => {
        return agreements.value.reduce((total, agreement) => {
            const value = Number(agreement.price ?? 0);
            return total + (Number.isFinite(value) ? value : 0);
        }, 0);
    });

    const pageEyebrow = computed(() => {
        if (currentPage.value === "agreements") {
            return isArabic.value ? "سجل MeaningLock" : "MEANINGLOCK VAULT";
        }

        if (currentPage.value === "activity") {
            return isArabic.value ? "سجل الأحداث" : "MEANINGLOCK ACTIVITY";
        }

        if (currentPage.value === "reports") {
            return isArabic.value ? "تحليلات MeaningLock" : "MEANINGLOCK ANALYTICS";
        }

        if (currentPage.value === "settings") {
            return isArabic.value ? "تخصيص MeaningLock" : "MEANINGLOCK SETTINGS";
        }

        return t("workspaceKicker");
    });

    const pageTitle = computed(() => {
        if (currentPage.value === "agreements") {
            return isArabic.value ? "الاتفاقات الموثقة" : "Verified Agreements";
        }

        if (currentPage.value === "activity") {
            return isArabic.value ? "النشاط" : "Activity";
        }

        if (currentPage.value === "reports") {
            return isArabic.value ? "التقارير والتحليلات" : "Reports & Analytics";
        }

        if (currentPage.value === "settings") {
            return isArabic.value ? "الإعدادات" : "Settings";
        }

        return t("conversationIntelligence");
    });

    const pageDescription = computed(() => {
        if (currentPage.value === "agreements") {
            return isArabic.value
                ? "راجع الاتفاقات المحفوظة، الأدلة النصية، سجل التأكيد وروابط المشاركة."
                : "Review saved agreements, conversation evidence, confirmation history and share links.";
        }

        if (currentPage.value === "activity") {
            return isArabic.value
                ? "تابع التعارضات، تحديثات الشروط، التأكيدات والتوثيق عبر جميع الاتفاقات."
                : "Track conflicts, term updates, confirmations and verification across all agreements.";
        }

        if (currentPage.value === "reports") {
            return isArabic.value
                ? "راقب أداء الاتفاقات، قيمة الصفقات، التعارضات وسلوك حل الشروط من البيانات المحفوظة."
                : "Monitor agreement performance, deal value, conflicts and resolution activity from saved evidence.";
        }

        if (currentPage.value === "settings") {
            return isArabic.value
                ? "تحكم في قواعد الاتفاق والصوت والتوضيح والحفظ التلقائي."
                : "Control agreement rules, voice behavior, clarification and automatic saving.";
        }

        return t("mainDescription");
    });

    function activityCategory(item) {
        if (["clarification", "missingClarification"].includes(item?.type)) {
            return "conflicts";
        }

        if (item?.type === "changed") {
            return "updates";
        }

        if (item?.type === "confirmed") {
            return "confirmations";
        }

        if (item?.type === "verified") {
            return "verified";
        }

        if (item?.type === "captured") {
            return "captured";
        }

        return "other";
    }

    const activityEvents = computed(() => {
        const rows = [];

        agreements.value.forEach((agreement) => {
            const history = agreementTimeline(agreement);
            const agreementDate = agreement.verified_at ?? agreement.created_at ?? null;

            if (!history.length && String(agreement.status).toLowerCase() === "verified") {
                rows.push({
                    id: `agreement-${agreement.id}-verified`,
                    type: "verified",
                    speaker: "AI",
                    time: "",
                    agreement,
                    agreementDate,
                    agreementReference: agreementReference(agreement),
                    category: "verified",
                    order: 0,
                });
                return;
            }

            history.forEach((item, index) => {
                rows.push({
                    ...item,
                    id: item.id ?? `agreement-${agreement.id}-event-${index}`,
                    agreement,
                    agreementDate,
                    agreementReference: agreementReference(agreement),
                    category: activityCategory(item),
                    order: index,
                });
            });
        });

        return rows.sort((a, b) => {
            const bDate = new Date(b.agreementDate ?? 0).getTime();
            const aDate = new Date(a.agreementDate ?? 0).getTime();

            if (bDate !== aDate) {
                return bDate - aDate;
            }

            return a.order - b.order;
        });
    });

    const filteredActivityEvents = computed(() => {
        const query = activitySearch.value.trim().toLowerCase();

        return activityEvents.value.filter((event) => {
            if (activityFilter.value !== "all" && event.category !== activityFilter.value) {
                return false;
            }

            if (!query) {
                return true;
            }

            const haystack = [
                event.agreementReference,
                event.agreement?.public_id,
                event.type,
                event.field,
                event.speaker,
                event.value,
                activityTitle(event),
                activityDescription(event),
            ]
                .filter((value) => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return haystack.includes(query);
        });
    });

    const activityConflictCount = computed(() => {
        return activityEvents.value.filter((event) => event.category === "conflicts").length;
    });

    const activityUpdateCount = computed(() => {
        return activityEvents.value.filter((event) => event.category === "updates").length;
    });

    const activityConfirmationCount = computed(() => {
        return activityEvents.value.filter((event) => event.category === "confirmations").length;
    });

    const activityVerifiedCount = computed(() => {
        return activityEvents.value.filter((event) => event.category === "verified").length;
    });

    /*
    |--------------------------------------------------------------------------
    | Reports analytics
    |--------------------------------------------------------------------------
    */

    function agreementAnalyticsDate(agreement) {
        const value = agreement?.verified_at ?? agreement?.created_at ?? null;
        const date = value ? new Date(value) : null;

        return date && !Number.isNaN(date.getTime()) ? date : null;
    }

    function reportStartDate() {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (reportRange.value === "today") {
            return start;
        }

        if (reportRange.value === "7d") {
            start.setDate(start.getDate() - 6);
            return start;
        }

        if (reportRange.value === "30d") {
            start.setDate(start.getDate() - 29);
            return start;
        }

        return null;
    }

    const reportAgreements = computed(() => {
        const start = reportStartDate();

        if (!start) {
            return agreements.value;
        }

        return agreements.value.filter((agreement) => {
            const date = agreementAnalyticsDate(agreement);
            return date ? date >= start : false;
        });
    });

    const reportVerifiedCount = computed(() => {
        return reportAgreements.value.filter(
            (agreement) => String(agreement.status ?? "").toLowerCase() === "verified",
        ).length;
    });

    const reportTotalValue = computed(() => {
        return reportAgreements.value.reduce((total, agreement) => {
            const value = Number(agreement.price ?? 0);
            return total + (Number.isFinite(value) ? value : 0);
        }, 0);
    });

    const reportAverageValue = computed(() => {
        if (!reportAgreements.value.length) {
            return 0;
        }

        return reportTotalValue.value / reportAgreements.value.length;
    });

    function agreementHasConflict(agreement) {
        return agreementTimeline(agreement).some((item) => item?.type === "clarification");
    }

    const reportConflictAgreements = computed(() => {
        return reportAgreements.value.filter(agreementHasConflict);
    });

    const reportConflictEvents = computed(() => {
        return reportAgreements.value.reduce((total, agreement) => {
            return (
                total +
                agreementTimeline(agreement).filter((item) => item?.type === "clarification").length
            );
        }, 0);
    });

    const reportResolvedConflictAgreements = computed(() => {
        return reportConflictAgreements.value.filter(
            (agreement) => String(agreement.status ?? "").toLowerCase() === "verified",
        ).length;
    });

    const reportConflictRate = computed(() => {
        if (!reportAgreements.value.length) {
            return 0;
        }

        return Math.round(
            (reportConflictAgreements.value.length / reportAgreements.value.length) * 100,
        );
    });

    const reportUpdateEvents = computed(() => {
        const rows = [];

        reportAgreements.value.forEach((agreement) => {
            agreementTimeline(agreement).forEach((item) => {
                if (item?.type === "changed" && item?.field) {
                    rows.push({ ...item, agreement });
                }
            });
        });

        return rows;
    });

    const reportFieldSeries = computed(() => {
        const counts = {
            price: 0,
            quantity: 0,
            date: 0,
            installation: 0,
        };

        reportUpdateEvents.value.forEach((event) => {
            if (Object.prototype.hasOwnProperty.call(counts, event.field)) {
                counts[event.field] += 1;
            }
        });

        const maximum = Math.max(1, ...Object.values(counts));

        return fields.map((field) => ({
            field,
            count: counts[field] ?? 0,
            percent: Math.round(((counts[field] ?? 0) / maximum) * 100),
        }));
    });

    const reportTopUpdatedField = computed(() => {
        const sorted = [...reportFieldSeries.value].sort((a, b) => b.count - a.count);
        return sorted[0]?.count ? sorted[0] : null;
    });

    function reportDateKey(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0"),
        ].join("-");
    }

    const reportDailySeries = computed(() => {
        const buckets = new Map();

        reportAgreements.value.forEach((agreement) => {
            const date = agreementAnalyticsDate(agreement);

            if (!date) {
                return;
            }

            const key = reportDateKey(date);
            const current = buckets.get(key) ?? {
                key,
                date,
                count: 0,
                value: 0,
            };

            current.count += 1;

            const price = Number(agreement.price ?? 0);
            current.value += Number.isFinite(price) ? price : 0;

            buckets.set(key, current);
        });

        const rows = [...buckets.values()]
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(-8);

        const maxCount = Math.max(1, ...rows.map((row) => row.count));
        const maxValue = Math.max(1, ...rows.map((row) => row.value));

        return rows.map((row) => ({
            ...row,
            countPercent: Math.max(8, Math.round((row.count / maxCount) * 100)),
            valuePercent: Math.max(8, Math.round((row.value / maxValue) * 100)),
            label: new Intl.DateTimeFormat(isArabic.value ? "ar-SA" : "en-US", {
                month: "short",
                day: "numeric",
            }).format(row.date),
        }));
    });

    const reportRecentAgreements = computed(() => {
        return [...reportAgreements.value]
            .sort((a, b) => {
                const bDate = agreementAnalyticsDate(b)?.getTime() ?? 0;
                const aDate = agreementAnalyticsDate(a)?.getTime() ?? 0;
                return bDate - aDate;
            })
            .slice(0, 5);
    });

    const reportVerificationRate = computed(() => {
        if (!reportAgreements.value.length) {
            return 0;
        }

        return Math.round((reportVerifiedCount.value / reportAgreements.value.length) * 100);
    });

    function activityTitle(event) {
        if (event.type === "verified") {
            return isArabic.value ? "تم توثيق الاتفاق" : "Agreement verified";
        }

        if (event.type === "confirmed") {
            const party = event.speaker === "A" ? t("speakerA") : t("speakerB");
            return isArabic.value ? `${party} أكد الاتفاق` : `${party} confirmed the agreement`;
        }

        if (event.type === "changed") {
            return isArabic.value
                ? `تم تحديث ${formatField(event.field)}`
                : `${formatField(event.field)} updated`;
        }

        if (event.type === "captured") {
            return isArabic.value
                ? `تم التقاط ${formatField(event.field)}`
                : `${formatField(event.field)} captured`;
        }

        if (event.type === "clarification") {
            return isArabic.value
                ? "MeaningLock اكتشف تعارضًا"
                : "MeaningLock detected a conflict";
        }

        if (event.type === "missingClarification") {
            return isArabic.value
                ? "MeaningLock طلب استكمال الشروط"
                : "MeaningLock requested missing terms";
        }

        return isArabic.value ? "حدث في الاتفاق" : "Agreement activity";
    }

    function activityDescription(event) {
        if (event.type === "changed" || event.type === "captured") {
            if (event.field && event.value !== undefined) {
                return `${formatField(event.field)}: ${formatValue(event.field, event.value)}`;
            }
        }

        if (event.type === "clarification") {
            const count = Number(event.value ?? 1);
            return isArabic.value
                ? `تم طلب توضيح قبل التأكيد${count > 1 ? ` • ${count} تعارضات` : ""}.`
                : `Clarification requested before confirmation${count > 1 ? ` • ${count} conflicts` : ""}.`;
        }

        if (event.type === "missingClarification") {
            const count = Number(event.value ?? 0);
            return isArabic.value
                ? `هناك ${count} من الشروط بحاجة إلى تأكيد.`
                : `${count} terms still required confirmation.`;
        }

        if (event.type === "confirmed") {
            return isArabic.value
                ? "تم تسجيل تأكيد الطرف على الشروط النهائية."
                : "The party confirmation was recorded against the final terms.";
        }

        if (event.type === "verified") {
            return isArabic.value
                ? "تطابقت الشروط وتم تأكيدها من الطرفين."
                : "The final terms matched and both parties confirmed them.";
        }

        return isArabic.value ? "نشاط محفوظ ضمن سجل الاتفاق." : "Saved activity from the agreement timeline.";
    }

    function activityIcon(event) {
        if (event.category === "conflicts") return "!";
        if (event.category === "updates") return "↻";
        if (event.category === "confirmations") return "✓";
        if (event.category === "verified") return "✦";
        if (event.category === "captured") return "+";
        return "•";
    }

    function activityDateLabel(event) {
        const base = formatAgreementDate(event.agreementDate, false);
        return event.time ? `${base} • ${event.time}` : base;
    }

    function openLivePage() {
        currentPage.value = "live";
        selectedAgreement.value = null;
    }

    async function openAgreementsPage() {
        currentPage.value = "agreements";
        selectedAgreement.value = null;
        await loadAgreements();
    }

    async function openActivityPage() {
        currentPage.value = "activity";
        selectedAgreement.value = null;
        await loadAgreements();
    }

    async function openReportsPage() {
        currentPage.value = "reports";
        selectedAgreement.value = null;
        await loadAgreements();
    }

    function openSettingsPage() {
        currentPage.value = "settings";
        selectedAgreement.value = null;
    }

    async function loadAgreements() {
        loadingAgreements.value = true;
        agreementsError.value = "";

        try {
            const response = await fetch("/api/agreements", {
                headers: {
                    Accept: "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.message ??
                        (isArabic.value
                            ? "تعذر تحميل الاتفاقات."
                            : "Could not load agreements."),
                );
            }

            const rows = Array.isArray(data) ? data : (data?.data ?? []);

            agreements.value = [...rows].sort((a, b) => {
                const bTime = new Date(b.verified_at ?? b.created_at ?? 0).getTime();
                const aTime = new Date(a.verified_at ?? a.created_at ?? 0).getTime();
                return bTime - aTime;
            });
        } catch (error) {
            console.error("Could not load agreements:", error);
            agreementsError.value = error.message;
        } finally {
            loadingAgreements.value = false;
        }
    }

    async function openAgreement(agreement) {
        selectedAgreement.value = agreement;
        loadingAgreement.value = true;

        try {
            const response = await fetch(`/api/agreements/${agreement.id}`, {
                headers: {
                    Accept: "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message ?? "Could not load agreement.");
            }

            selectedAgreement.value = data;
        } catch (error) {
            console.error("Could not load agreement details:", error);
            // Keep the list record visible as a graceful fallback.
        } finally {
            loadingAgreement.value = false;
        }
    }

    async function openActivityAgreement(event) {
        if (!event?.agreement) {
            return;
        }

        currentPage.value = "agreements";
        selectedAgreement.value = event.agreement;
        await openAgreement(event.agreement);
    }

    async function openAgreementFromReport(agreement) {
        currentPage.value = "agreements";
        selectedAgreement.value = agreement;
        await openAgreement(agreement);
    }

    function closeAgreement() {
        selectedAgreement.value = null;
    }

    function agreementReference(agreement) {
        if (!agreement?.id) {
            return "ML-000000";
        }

        return `ML-${String(agreement.id).padStart(6, "0")}`;
    }

    function publicAgreementUrl(agreement) {
        if (!agreement?.public_id) {
            return "";
        }

        return `${window.location.origin}/agreement/${agreement.public_id}`;
    }

    function agreementTermValue(agreement, field) {
        if (!agreement) {
            return undefined;
        }

        if (field === "date") {
            return agreement.delivery_date;
        }

        return agreement[field];
    }

    function parseArrayValue(value) {
        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value === "string") {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }

        return [];
    }

    function agreementTranscript(agreement) {
        return parseArrayValue(agreement?.transcript);
    }

    function agreementTimeline(agreement) {
        return parseArrayValue(agreement?.timeline);
    }

    function formatAgreementDate(value, includeTime = false) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat(isArabic.value ? "ar-SA" : "en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            ...(includeTime
                ? {
                      hour: "2-digit",
                      minute: "2-digit",
                  }
                : {}),
        }).format(date);
    }

    function formatAgreementMoney(value) {
        const number = Number(value ?? 0);

        if (!Number.isFinite(number)) {
            return "—";
        }

        return isArabic.value
            ? `${number.toLocaleString("ar-SA")} دولار`
            : `$${number.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
              })}`;
    }

    async function copyAgreementPublicLink(agreement) {
        const url = publicAgreementUrl(agreement);

        if (!url) {
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            copiedAgreementId.value = agreement.id;

            window.setTimeout(() => {
                if (copiedAgreementId.value === agreement.id) {
                    copiedAgreementId.value = null;
                }
            }, 1800);
        } catch (error) {
            console.error("Could not copy agreement link:", error);
        }
    }

    function openPublicAgreement(agreement) {
        const url = publicAgreementUrl(agreement);

        if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    const translatedStatus = computed(() => {
        const statusMap = {
            ready: "statusReady",

            connecting: "statusConnecting",

            connectingMicrophone: "statusConnectingMicrophone",

            live: "statusLive",

            stopped: "statusStopped",

            connectionError: "statusConnectionError",

            disconnected: "statusDisconnected",

            unableStart: "statusUnableStart",
        };

        return t(statusMap[status.value] ?? "statusReady");
    });

    const statusClass = computed(() => {
        if (status.value === "live") {
            return "is-live";
        }

        if (status.value === "connectionError" || status.value === "disconnected") {
            return "is-error";
        }

        return "";
    });

    /*
    |--------------------------------------------------------------------------
    | Speaker
    |--------------------------------------------------------------------------
    */

    function selectSpeaker(speaker) {
        currentSpeaker.value = speaker;
    }

    function speakerName(speaker) {
        return speaker === "A" ? t("speakerA") : t("speakerB");
    }

    /*
    |--------------------------------------------------------------------------
    | AssemblyAI
    |--------------------------------------------------------------------------
    */

    async function startConversation() {
        try {
            if (socket && socket.readyState === WebSocket.OPEN) {
                return;
            }

            status.value = "connecting";

            const response = await fetch("/assemblyai/token");

            if (!response.ok) {
                throw new Error("Could not create AssemblyAI session");
            }

            const data = await response.json();

            const token = data.token;

            const wsUrl =
                "wss://streaming.assemblyai.com/v3/ws" +
                "?sample_rate=16000" +
                "&speech_model=universal-3-5-pro" +
                "&format_turns=true" +
                "&token=" +
                encodeURIComponent(token);

            socket = new WebSocket(wsUrl);

            socket.onopen = async () => {
                status.value = "connectingMicrophone";

                await startMicrophone();
            };

            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);

                console.log("AssemblyAI:", message);

                if (message.type === "Begin") {
                    status.value = "live";
                }

                if (message.type === "Turn") {
                    handleTurn(message);
                }

                if (message.type === "Termination") {
                    status.value = "stopped";
                }
            };

            socket.onerror = (error) => {
                console.error("AssemblyAI WebSocket error:", error);

                status.value = "connectionError";
            };

            socket.onclose = () => {
                if (status.value !== "stopped") {
                    status.value = "disconnected";
                }
            };
        } catch (error) {
            console.error(error);

            status.value = "unableStart";
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Filter recognition noise
    |--------------------------------------------------------------------------
    */

    function isMeaningfulTurn(text) {
        const cleanText = text.trim();

        if (!cleanText) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | If the sentence contains a real agreement commitment,
        | always keep it even if it is short.
        |--------------------------------------------------------------------------
        |
        | Examples:
        |
        | $15,000
        | 50 units
        | Installation is included
        |
        */

        const extracted = extractCommitments(cleanText);

        if (Object.keys(extracted).length > 0) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | Explicit common noise
        |--------------------------------------------------------------------------
        */

        const normalized = cleanText
            .toLowerCase()
            .replace(/[.,!?]/g, "")
            .trim();

        const ignoredPhrases = [
            "way low",
            "meaning lock",
            "meaninglock",
            "correction",
            "okay",
            "ok",
            "hello",
        ];

        if (ignoredPhrases.includes(normalized)) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Ignore other very short accidental recognition
        |--------------------------------------------------------------------------
        */

        if (!settings.value.ignoreShortPhrases) {
            return true;
        }

        const words = cleanText.split(/\s+/).filter(Boolean);
        const minimumWords = Math.max(1, Number(settings.value.minimumWords) || 1);

        return words.length >= minimumWords;
    }

    /*
    |--------------------------------------------------------------------------
    | Handle transcript turn
    |--------------------------------------------------------------------------
    */

    function handleTurn(message) {
        /*
        |--------------------------------------------------------------------------
        | Partial live transcript
        |--------------------------------------------------------------------------
        */

        if (!message.end_of_turn) {
            if (!isAiSpeaking.value) {
                partialTranscript.value = message.transcript ?? "";
            }

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Empty final turn
        |--------------------------------------------------------------------------
        */

        if (!message.transcript) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Ignore transcription that arrived while AI is speaking
        |--------------------------------------------------------------------------
        */

        if (isAiSpeaking.value) {
            partialTranscript.value = "";

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Ignore recognition noise
        |--------------------------------------------------------------------------
        */

        if (!isMeaningfulTurn(message.transcript)) {
            console.log("Ignored non-meaningful turn:", message.transcript);

            partialTranscript.value = "";

            return;
        }

        const speaker = currentSpeaker.value;

        /*
        |--------------------------------------------------------------------------
        | Add professional transcript card
        |--------------------------------------------------------------------------
        */

        transcriptTurns.value.push({
            id: `${Date.now()}-${Math.random()}`,

            speaker,

            text: message.transcript,

            time: new Date().toLocaleTimeString(
                isArabic.value ? "ar-SA" : "en-US",
                {
                    hour: "2-digit",

                    minute: "2-digit",
                },
            ),
        });

        /*
        |--------------------------------------------------------------------------
        | Extract commitments
        |--------------------------------------------------------------------------
        */

        processCommitments(message.transcript, speaker);

        partialTranscript.value = "";

        /*
        |--------------------------------------------------------------------------
        | Check if MeaningLock should automatically clarify
        |--------------------------------------------------------------------------
        */

        evaluateAutoClarification();
    }

    /*
    |--------------------------------------------------------------------------
    | Microphone
    |--------------------------------------------------------------------------
    */

    async function startMicrophone() {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: settings.value.noiseFiltering
                ? {
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true,
                  }
                : true,
        });

        audioContext = new AudioContext();

        source = audioContext.createMediaStreamSource(mediaStream);

        processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
            /*
                |--------------------------------------------------------------------------
                | IMPORTANT
                |--------------------------------------------------------------------------
                |
                | MeaningLock is speaking.
                |
                | Do not send microphone audio to AssemblyAI.
                |
                */

            if (isAiSpeaking.value) {
                return;
            }

            if (!socket || socket.readyState !== WebSocket.OPEN) {
                return;
            }

            const input = event.inputBuffer.getChannelData(0);

            const pcm = downsampleTo16k(input, audioContext.sampleRate);

            socket.send(pcm.buffer);
        };

        source.connect(processor);

        processor.connect(audioContext.destination);

        status.value = "live";
    }

    /*
    |--------------------------------------------------------------------------
    | Audio conversion
    |--------------------------------------------------------------------------
    */

    function downsampleTo16k(input, inputSampleRate) {
        const outputSampleRate = 16000;

        if (inputSampleRate === outputSampleRate) {
            const result = new Int16Array(input.length);

            for (let i = 0; i < input.length; i++) {
                const sample = Math.max(-1, Math.min(1, input[i]));

                result[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            }

            return result;
        }

        const ratio = inputSampleRate / outputSampleRate;

        const newLength = Math.round(input.length / ratio);

        const result = new Int16Array(newLength);

        let offsetResult = 0;

        let offsetBuffer = 0;

        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);

            let accumulator = 0;

            let count = 0;

            for (
                let i = offsetBuffer;
                i < nextOffsetBuffer && i < input.length;
                i++
            ) {
                accumulator += input[i];

                count++;
            }

            const sample = count > 0 ? accumulator / count : 0;

            const normalized = Math.max(-1, Math.min(1, sample));

            result[offsetResult] =
                normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff;

            offsetResult++;

            offsetBuffer = nextOffsetBuffer;
        }

        return result;
    }

    /*
    |--------------------------------------------------------------------------
    | Arabic number normalization
    |--------------------------------------------------------------------------
    */

    function normalizeArabicNumbers(text) {
        const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

        const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

        return text

            .replace(/[٠-٩]/g, (digit) => arabicDigits.indexOf(digit))

            .replace(/[۰-۹]/g, (digit) => persianDigits.indexOf(digit))

            .replace(/٬/g, ",")

            .replace(/٫/g, ".");
    }

    /*
    |--------------------------------------------------------------------------
    | Commitment extraction
    |--------------------------------------------------------------------------
    */

    function extractCommitments(originalText) {
        const result = {};

        const text = normalizeArabicNumbers(originalText);

        /*
        |--------------------------------------------------------------------------
        | PRICE
        |--------------------------------------------------------------------------
        */

        const priceMatch =
            // $15,000
            text.match(/\$\s?([\d,]+(?:\.\d+)?)/i) ||
            // 15,000 dollars
            text.match(/([\d,]+(?:\.\d+)?)\s?(?:USD|dollars?|dollar)/i) ||
            /*
    |--------------------------------------------------------------------------
    | Price expressed after "for"
    |--------------------------------------------------------------------------
    |
    | Examples:
    |
    | 50 units for 15,000
    | price is 15,000
    | cost 15,000
    | total is 15,000
    |
    | IMPORTANT:
    | Do not use "agreement is" here because:
    |
    | "agreement is 50 units for 15,000"
    |
    | would incorrectly detect 50 as the price.
    |
    */

            text.match(
                /(?:for|price(?:\s+is)?|cost(?:s)?|total(?:\s+is)?)\s+\$?([\d,]+(?:\.\d+)?)/i,
            ) ||
            // 15000 دولار / ريال
            text.match(
                /([\d,]+(?:\.\d+)?)\s*(?:دولار|دولاراً|دولارا|ريال|ريالاً|ريالا|ريال سعودي)/i,
            ) ||
            // مقابل 15000
            text.match(
                /(?:مقابل|بسعر|السعر|بقيمة|التكلفة|الاتفاق)\s*([\d,]+(?:\.\d+)?)/i,
            );

        if (priceMatch) {
            result.price = Number(priceMatch[1].replace(/,/g, ""));
        }

        /*
        |--------------------------------------------------------------------------
        | QUANTITY
        |--------------------------------------------------------------------------
        */

        const quantityMatch =
            text.match(/(\d+)\s+(?:units?|items?|pieces?)/i) ||
            text.match(/(\d+)\s*(?:وحدة|وحدات|قطعة|قطع)/i);

        if (quantityMatch) {
            result.quantity = Number(quantityMatch[1]);
        }

        /*
        |--------------------------------------------------------------------------
        | DATE - English
        |--------------------------------------------------------------------------
        */

        const englishDate = text.match(
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?/i,
        );

        /*
        |--------------------------------------------------------------------------
        | DATE - Arabic
        |--------------------------------------------------------------------------
        */

        const arabicDate =
            text.match(
                /\b\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)(?:\s+\d{4})?/i,
            ) ||
            text.match(
                /(?:يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)\s+\d{1,2}(?:\s+\d{4})?/i,
            );

        if (englishDate) {
            result.date = englishDate[0].replace(/(\d+)(st|nd|rd|th)/i, "$1");
        } else if (arabicDate) {
            result.date = arabicDate[0];
        }

        /*
        |--------------------------------------------------------------------------
        | INSTALLATION EXCLUDED
        |--------------------------------------------------------------------------
        */

        if (
            /installation\s+(?:is\s+)?not\s+included/i.test(text) ||
            /installation\s+excluded/i.test(text) ||
            /without\s+installation/i.test(text) ||
            /التركيب\s+(?:غير\s+مشمول|غير\s+متضمن|ليس\s+مشمولاً?|ليس\s+ضمن)/i.test(
                text,
            ) ||
            /لا\s+يشمل\s+التركيب/i.test(text) ||
            /بدون\s+تركيب/i.test(text)
        ) {
            result.installation = "Excluded";
        } else if (
            /*
        |--------------------------------------------------------------------------
        | INSTALLATION INCLUDED
        |--------------------------------------------------------------------------
        */
            /installation\s+(?:is\s+)?included/i.test(text) ||
            /including\s+installation/i.test(text) ||
            /with\s+installation/i.test(text) ||
            /التركيب\s+(?:مشمول|متضمن|ضمن)/i.test(text) ||
            /يشمل\s+التركيب/i.test(text) ||
            /مع\s+التركيب/i.test(text)
        ) {
            result.installation = "Included";
        }

        return result;
    }

    /*
    |--------------------------------------------------------------------------
    | Process commitments
    |--------------------------------------------------------------------------
    */

    function processCommitments(text, speaker) {
        const extracted = extractCommitments(text);

        /*
        |--------------------------------------------------------------------------
        | No agreement data
        |--------------------------------------------------------------------------
        */

        if (Object.keys(extracted).length === 0) {
            return;
        }

        const existing = speaker === "A" ? speakerA.value : speakerB.value;

        const updated = {
            ...existing,
            ...extracted,
        };

        if (speaker === "A") {
            speakerA.value = updated;
        } else {
            speakerB.value = updated;
        }

        /*
        |--------------------------------------------------------------------------
        | If terms change, confirmations become invalid
        |--------------------------------------------------------------------------
        */

        confirmations.value = {
            A: false,
            B: false,
        };

        /*
        |--------------------------------------------------------------------------
        | Timeline
        |--------------------------------------------------------------------------
        */

        for (const [field, value] of Object.entries(extracted)) {
            const oldValue = existing[field];

            if (oldValue === value) {
                continue;
            }

            addTimelineEvent({
                speaker,

                field,

                value,

                type: oldValue !== undefined ? "changed" : "captured",
            });
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Conflict engine
    |--------------------------------------------------------------------------
    */

    const conflicts = computed(() => {
        const result = [];

        for (const field of fields) {
            const a = speakerA.value[field];

            const b = speakerB.value[field];

            if (a === undefined || b === undefined) {
                continue;
            }

            if (String(a).toLowerCase() !== String(b).toLowerCase()) {
                result.push({
                    field,
                    a,
                    b,
                });
            }
        }

        return result;
    });

    /*
    |--------------------------------------------------------------------------
    | Speaker data
    |--------------------------------------------------------------------------
    */

    const bothSpeakersHaveData = computed(() => {
        return (
            Object.keys(speakerA.value).length > 0 &&
            Object.keys(speakerB.value).length > 0
        );
    });

    const speakerAComplete = computed(() => {
        return requiredFields.value.every((field) => speakerA.value[field] !== undefined);
    });

    const speakerBComplete = computed(() => {
        return requiredFields.value.every((field) => speakerB.value[field] !== undefined);
    });

    const bothComplete = computed(() => {
        return speakerAComplete.value && speakerBComplete.value;
    });

    /*
    |--------------------------------------------------------------------------
    | Compared terms
    |--------------------------------------------------------------------------
    */

    const comparedTerms = computed(() => {
        return fields.filter(
            (field) =>
                speakerA.value[field] !== undefined &&
                speakerB.value[field] !== undefined,
        ).length;
    });

    const alignedTerms = computed(() => {
        return requiredFields.value.filter((field) => {
            const a = speakerA.value[field];

            const b = speakerB.value[field];

            return (
                a !== undefined &&
                b !== undefined &&
                String(a).toLowerCase() === String(b).toLowerCase()
            );
        }).length;
    });

    const detectedCommitments = computed(() => {
        return (
            Object.keys(speakerA.value).length + Object.keys(speakerB.value).length
        );
    });

    /*
    |--------------------------------------------------------------------------
    | Agreement score
    |--------------------------------------------------------------------------
    */

    const agreementScore = computed(() => {
        return Math.round((alignedTerms.value / requiredFields.value.length) * 100);
    });

    /*
    |--------------------------------------------------------------------------
    | Missing terms
    |--------------------------------------------------------------------------
    */

    const missingTerms = computed(() => {
        const missing = [];

        for (const field of requiredFields.value) {
            if (speakerA.value[field] === undefined) {
                missing.push({
                    speaker: "A",

                    field,
                });
            }

            if (speakerB.value[field] === undefined) {
                missing.push({
                    speaker: "B",

                    field,
                });
            }
        }

        return missing;
    });

    /*
    |--------------------------------------------------------------------------
    | Agreement states
    |--------------------------------------------------------------------------
    */

    const needsConfirmation = computed(() => {
        return (
            bothSpeakersHaveData.value &&
            conflicts.value.length === 0 &&
            !bothComplete.value
        );
    });

    const termsAlignedAndComplete = computed(() => {
        return bothComplete.value && conflicts.value.length === 0;
    });

    const verifiedAgreement = computed(() => {
        return (
            termsAlignedAndComplete.value &&
            confirmations.value.A &&
            confirmations.value.B
        );
    });

    const agreementState = computed(() => {
        if (conflicts.value.length) {
            return t("conflictDetected");
        }

        if (verifiedAgreement.value) {
            return t("verified");
        }

        if (needsConfirmation.value) {
            return t("needsConfirmation");
        }

        if (termsAlignedAndComplete.value) {
            return t("aligned");
        }

        return t("monitoring");
    });

    const agreementStateClass = computed(() => {
        if (conflicts.value.length) {
            return "danger";
        }

        if (verifiedAgreement.value) {
            return "verified";
        }

        if (needsConfirmation.value) {
            return "pending";
        }

        if (termsAlignedAndComplete.value) {
            return "safe";
        }

        return "";
    });

    /*
    |--------------------------------------------------------------------------
    | Formatting
    |--------------------------------------------------------------------------
    */

    function formatField(field) {
        const map = {
            price: "price",

            quantity: "quantity",

            date: "delivery",

            installation: "installation",
        };

        return t(map[field] ?? field);
    }

    function formatValue(field, value) {
        if (value === undefined || value === null || value === "") {
            return "—";
        }

        if (field === "price") {
            return isArabic.value
                ? `${Number(value).toLocaleString("ar-SA")} دولار`
                : `$${Number(value).toLocaleString("en-US")}`;
        }

        if (field === "quantity") {
            return isArabic.value
                ? `${Number(value).toLocaleString("ar-SA")} ${t("units")}`
                : `${value} ${t("units")}`;
        }

        if (field === "installation") {
            return value === "Included" ? t("included") : t("excluded");
        }

        return value;
    }

    /*
    |--------------------------------------------------------------------------
    | Timeline
    |--------------------------------------------------------------------------
    */

    function addTimelineEvent(event) {
        const now = new Date();

        timeline.value.unshift({
            id: `${Date.now()}-${Math.random()}`,

            time: now.toLocaleTimeString(isArabic.value ? "ar-SA" : "en-US", {
                hour: "2-digit",

                minute: "2-digit",
            }),

            ...event,
        });

        timeline.value = timeline.value.slice(0, 20);
    }

    /*
    |--------------------------------------------------------------------------
    | MeaningLock voice
    |--------------------------------------------------------------------------
    */

    function speakText(text) {
        if (!settings.value.aiVoice) {
            return;
        }

        if (!("speechSynthesis" in window)) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Stop previous voice
        |--------------------------------------------------------------------------
        */

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.rate = Math.min(1.5, Math.max(0.6, Number(settings.value.speechRate) || 0.95));

        utterance.lang =
            settings.value.voiceLanguage === "ar"
                ? "ar-SA"
                : settings.value.voiceLanguage === "en"
                  ? "en-US"
                  : isArabic.value
                    ? "ar-SA"
                    : "en-US";

        /*
        |--------------------------------------------------------------------------
        | NEW
        |--------------------------------------------------------------------------
        |
        | MeaningLock started talking:
        | pause microphone streaming.
        |
        */

        utterance.onstart = () => {
            isAiSpeaking.value = true;

            partialTranscript.value = "";
        };

        /*
        |--------------------------------------------------------------------------
        | MeaningLock finished:
        | resume microphone streaming.
        |--------------------------------------------------------------------------
        */

        utterance.onend = () => {
            isAiSpeaking.value = false;
        };

        /*
        |--------------------------------------------------------------------------
        | Safety
        |--------------------------------------------------------------------------
        */

        utterance.onerror = () => {
            isAiSpeaking.value = false;
        };

        window.speechSynthesis.speak(utterance);
    }

    /*
    |--------------------------------------------------------------------------
    | Conflict clarification text
    |--------------------------------------------------------------------------
    */

    function buildConflictMessage() {
        const conflictText = conflicts.value
            .map((item) => {
                return (
                    `${formatField(item.field)}: ` +
                    `${t("speakerASaid")} ` +
                    `${formatValue(item.field, item.a)}, ` +
                    `${t("speakerBSaid")} ` +
                    `${formatValue(item.field, item.b)}.`
                );
            })
            .join(" ");

        return (
            `${t("disagreementPrefix")} ` +
            `${conflictText} ` +
            `${t("clarifyBeforeConfirm")}`
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Missing commitment clarification
    |--------------------------------------------------------------------------
    */

    function buildMissingMessage() {
        const missingText = missingTerms.value

            .map((item) => {
                return (
                    `${speakerName(item.speaker)} ` +
                    `${t("hasNotConfirmed")} ` +
                    `${formatField(item.field)}`
                );
            })

            .join(isArabic.value ? "، " : ", ");

        return (
            `${t("missingPrefix")} ` +
            `${missingText}. ` +
            `${t("confirmMissingTerms")}`
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Ask clarification
    |--------------------------------------------------------------------------
    */

    function askForClarification(automatic = false) {
        /*
        |--------------------------------------------------------------------------
        | Conflict
        |--------------------------------------------------------------------------
        */

        if (conflicts.value.length) {
            clarificationMessage.value = buildConflictMessage();

            speakText(clarificationMessage.value);

            addTimelineEvent({
                speaker: "AI",

                field: "clarification",

                value: conflicts.value.length,

                type: "clarification",

                automatic,
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Missing terms
        |--------------------------------------------------------------------------
        */

        if (needsConfirmation.value) {
            clarificationMessage.value = buildMissingMessage();

            speakText(clarificationMessage.value);

            addTimelineEvent({
                speaker: "AI",

                field: "missing",

                value: missingTerms.value.length,

                type: "missingClarification",

                automatic,
            });

            return;
        }

        clarificationMessage.value = t("noClarificationRequired");
    }

    /*
    |--------------------------------------------------------------------------
    | Automatic clarification
    |--------------------------------------------------------------------------
    */

    function evaluateAutoClarification() {
        /*
        |--------------------------------------------------------------------------
        | Conflict resolved
        |--------------------------------------------------------------------------
        */

        if (!conflicts.value.length) {
            lastAutoPromptSignature.value = "";

            clarificationMessage.value = "";

            return;
        }

        if (!settings.value.autoClarification) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Create signature so same conflict is not spoken repeatedly
        |--------------------------------------------------------------------------
        */

        const signature = conflicts.value

            .map((item) => `${item.field}:${item.a}:${item.b}`)

            .sort()

            .join("|");

        if (signature === lastAutoPromptSignature.value) {
            return;
        }

        lastAutoPromptSignature.value = signature;

        askForClarification(true);
    }

    /*
    |--------------------------------------------------------------------------
    | Agreement persistence
    |--------------------------------------------------------------------------
    */

    function getCsrfToken() {
        return (
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") ?? ""
        );
    }

    function normalizeDateForApi(value) {
        if (!value) {
            return null;
        }

        const raw = String(value).trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
        }

        const clean = raw.replace(/(\d+)(st|nd|rd|th)/gi, "$1");

        const months = {
            january: 1,
            february: 2,
            march: 3,
            april: 4,
            may: 5,
            june: 6,
            july: 7,
            august: 8,
            september: 9,
            october: 10,
            november: 11,
            december: 12,
        };

        const englishMatch = clean.match(
            /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,\s*(\d{4}))?$/i,
        );

        if (englishMatch) {
            const year = englishMatch[3]
                ? Number(englishMatch[3])
                : new Date().getFullYear();
            const month = months[englishMatch[1].toLowerCase()];
            const day = Number(englishMatch[2]);
            const candidate = new Date(year, month - 1, day);

            if (
                candidate.getFullYear() === year &&
                candidate.getMonth() === month - 1 &&
                candidate.getDate() === day
            ) {
                return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            }
        }

        const parsed = new Date(clean);

        if (!Number.isNaN(parsed.getTime())) {
            return [
                parsed.getFullYear(),
                String(parsed.getMonth() + 1).padStart(2, "0"),
                String(parsed.getDate()).padStart(2, "0"),
            ].join("-");
        }

        return null;
    }

    async function saveVerifiedAgreement() {
        if (!verifiedAgreement.value) {
            return;
        }

        if (savedAgreement.value || savingAgreement.value) {
            return;
        }

        try {
            savingAgreement.value = true;
            saveAgreementError.value = "";
            shareCopied.value = false;

            const csrfToken = getCsrfToken();

            const headers = {
                "Content-Type": "application/json",
                Accept: "application/json",
            };

            if (csrfToken) {
                headers["X-CSRF-TOKEN"] = csrfToken;
            }

            const response = await fetch("/api/agreements", {
                method: "POST",
                credentials: "same-origin",
                headers,
                body: JSON.stringify({
                    price: speakerA.value.price,
                    quantity: speakerA.value.quantity,
                    delivery_date: normalizeDateForApi(speakerA.value.date),
                    installation: speakerA.value.installation,

                    speaker_a_confirmed: confirmations.value.A,
                    speaker_b_confirmed: confirmations.value.B,

                    speaker_a_terms: speakerA.value,
                    speaker_b_terms: speakerB.value,

                    transcript: transcriptTurns.value,
                    timeline: timeline.value,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ??
                        (isArabic.value
                            ? "تعذر حفظ الاتفاق."
                            : "Could not save agreement."),
                );
            }

            savedAgreement.value = {
                ...data.agreement,
                share_url: data.share_url,
            };

            addTimelineEvent({
                speaker: "AI",
                type: "saved",
                value: savedAgreement.value.public_id ?? null,
            });
        } catch (error) {
            console.error("Agreement save error:", error);

            saveAgreementError.value =
                error?.message ??
                (isArabic.value
                    ? "تعذر حفظ الاتفاق."
                    : "Could not save agreement.");
        } finally {
            savingAgreement.value = false;
        }
    }

    async function retrySaveAgreement() {
        savedAgreement.value = null;
        saveAgreementError.value = "";

        await saveVerifiedAgreement();
    }

    async function copyShareLink() {
        if (!savedAgreement.value?.share_url) {
            return;
        }

        try {
            await navigator.clipboard.writeText(savedAgreement.value.share_url);

            shareCopied.value = true;

            window.setTimeout(() => {
                shareCopied.value = false;
            }, 1800);
        } catch (error) {
            console.error("Copy share link error:", error);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Final confirmation
    |--------------------------------------------------------------------------
    */

    async function confirmParty(speaker) {
        if (!termsAlignedAndComplete.value) {
            return;
        }

        if (confirmations.value[speaker]) {
            return;
        }

        confirmations.value = {
            ...confirmations.value,

            [speaker]: true,
        };

        addTimelineEvent({
            speaker,

            type: "confirmed",
        });

        /*
        |--------------------------------------------------------------------------
        | Both confirmed
        |--------------------------------------------------------------------------
        */

        if (confirmations.value.A && confirmations.value.B) {
            addTimelineEvent({
                speaker: "AI",

                type: "verified",
            });

            clarificationMessage.value = "";

            /*
            |--------------------------------------------------------------------------
            | Persist the verified agreement
            |--------------------------------------------------------------------------
            */

            if (settings.value.autoSaveVerified) {
                await saveVerifiedAgreement();
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Stop
    |--------------------------------------------------------------------------
    */

    async function stopConversation() {
        try {
            /*
            |--------------------------------------------------------------------------
            | Stop AI voice
            |--------------------------------------------------------------------------
            */

            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }

            isAiSpeaking.value = false;

            /*
            |--------------------------------------------------------------------------
            | Stop AssemblyAI
            |--------------------------------------------------------------------------
            */

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(
                    JSON.stringify({
                        type: "Terminate",
                    }),
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Stop audio processor
            |--------------------------------------------------------------------------
            */

            if (processor) {
                processor.disconnect();

                processor = null;
            }

            if (source) {
                source.disconnect();

                source = null;
            }

            if (mediaStream) {
                mediaStream.getTracks().forEach((track) => track.stop());

                mediaStream = null;
            }

            if (audioContext) {
                await audioContext.close();

                audioContext = null;
            }

            status.value = "stopped";
        } catch (error) {
            console.error(error);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Clear
    |--------------------------------------------------------------------------
    */

    function clearSession() {
        /*
        |--------------------------------------------------------------------------
        | Stop MeaningLock voice
        |--------------------------------------------------------------------------
        */

        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

        isAiSpeaking.value = false;

        /*
        |--------------------------------------------------------------------------
        | Clear session
        |--------------------------------------------------------------------------
        */

        transcriptTurns.value = [];

        partialTranscript.value = "";

        speakerA.value = {};

        speakerB.value = {};

        confirmations.value = {
            A: false,
            B: false,
        };

        timeline.value = [];

        clarificationMessage.value = "";

        lastAutoPromptSignature.value = "";

        savedAgreement.value = null;

        savingAgreement.value = false;

        saveAgreementError.value = "";

        shareCopied.value = false;

        currentSpeaker.value = "A";
    }

    return {
        locale,
        messages,
        isArabic,
        t,
        applyDocumentLanguage,
        changeLanguage,
        status,
        transcriptTurns,
        partialTranscript,
        currentSpeaker,
        speakerA,
        speakerB,
        confirmations,
        timeline,
        clarificationMessage,
        lastAutoPromptSignature,
        savedAgreement,
        savingAgreement,
        saveAgreementError,
        shareCopied,
        currentPage,
        agreements,
        loadingAgreements,
        agreementsError,
        selectedAgreement,
        loadingAgreement,
        agreementSearch,
        agreementStatusFilter,
        copiedAgreementId,
        activitySearch,
        activityFilter,
        reportRange,
        isAiSpeaking,
        socket,
        audioContext,
        mediaStream,
        source,
        processor,
        fields,
        SETTINGS_STORAGE_KEY,
        defaultSettings,
        loadSettings,
        settings,
        requiredFields,
        resetSettings,
        initializeApp,
        filteredAgreements,
        verifiedAgreementsCount,
        agreementsTotalValue,
        pageEyebrow,
        pageTitle,
        pageDescription,
        activityCategory,
        activityEvents,
        filteredActivityEvents,
        activityConflictCount,
        activityUpdateCount,
        activityConfirmationCount,
        activityVerifiedCount,
        agreementAnalyticsDate,
        reportStartDate,
        reportAgreements,
        reportVerifiedCount,
        reportTotalValue,
        reportAverageValue,
        agreementHasConflict,
        reportConflictAgreements,
        reportConflictEvents,
        reportResolvedConflictAgreements,
        reportConflictRate,
        reportUpdateEvents,
        reportFieldSeries,
        reportTopUpdatedField,
        reportDateKey,
        reportDailySeries,
        reportRecentAgreements,
        reportVerificationRate,
        activityTitle,
        activityDescription,
        activityIcon,
        activityDateLabel,
        openLivePage,
        openAgreementsPage,
        openActivityPage,
        openReportsPage,
        openSettingsPage,
        loadAgreements,
        openAgreement,
        openActivityAgreement,
        openAgreementFromReport,
        closeAgreement,
        agreementReference,
        publicAgreementUrl,
        agreementTermValue,
        parseArrayValue,
        agreementTranscript,
        agreementTimeline,
        formatAgreementDate,
        formatAgreementMoney,
        copyAgreementPublicLink,
        openPublicAgreement,
        translatedStatus,
        statusClass,
        selectSpeaker,
        speakerName,
        startConversation,
        isMeaningfulTurn,
        handleTurn,
        startMicrophone,
        downsampleTo16k,
        normalizeArabicNumbers,
        extractCommitments,
        processCommitments,
        conflicts,
        bothSpeakersHaveData,
        speakerAComplete,
        speakerBComplete,
        bothComplete,
        comparedTerms,
        alignedTerms,
        detectedCommitments,
        agreementScore,
        missingTerms,
        needsConfirmation,
        termsAlignedAndComplete,
        verifiedAgreement,
        agreementState,
        agreementStateClass,
        formatField,
        formatValue,
        addTimelineEvent,
        speakText,
        buildConflictMessage,
        buildMissingMessage,
        askForClarification,
        evaluateAutoClarification,
        getCsrfToken,
        saveVerifiedAgreement,
        retrySaveAgreement,
        copyShareLink,
        confirmParty,
        stopConversation,
        clearSession
    };
}
