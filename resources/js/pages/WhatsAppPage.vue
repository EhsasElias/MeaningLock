<script setup>
import { computed, inject, onMounted, onUnmounted, ref } from "vue";

const app = inject("meaningLock");
const { isArabic } = app;

const overview = ref(null);
const loading = ref(false);
const error = ref("");
const copied = ref(false);
let refreshTimer = null;

const stats = computed(() => overview.value?.stats ?? {});
const sessions = computed(() => overview.value?.sessions ?? []);
const messages = computed(() => overview.value?.messages ?? []);
const connection = computed(() => overview.value?.connection ?? {});

const connected = computed(() => {
    return Boolean(connection.value.twilio_configured);
});

async function loadOverview() {
    loading.value = true;
    error.value = "";

    try {
        const response = await fetch("/api/whatsapp/overview", {
            headers: { Accept: "application/json" },
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.message ?? "Could not load WhatsApp overview.");
        }

        overview.value = data;
    } catch (err) {
        console.error(err);
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function copyWebhook() {
    const value = connection.value.webhook_url;
    if (!value) return;

    try {
        await navigator.clipboard.writeText(value);
        copied.value = true;
        window.setTimeout(() => (copied.value = false), 1600);
    } catch {
        const input = document.createElement("textarea");
        input.value = value;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        copied.value = true;
        window.setTimeout(() => (copied.value = false), 1600);
    }
}

function statusLabel(status) {
    const ar = {
        waiting_party_b: "بانتظار الطرف ب",
        active: "نشط",
        clarification_required: "يحتاج توضيح",
        aligned: "الشروط متطابقة",
        verified: "موثق",
        cancelled: "ملغي",
    };

    const en = {
        waiting_party_b: "Waiting for Party B",
        active: "Active",
        clarification_required: "Clarification required",
        aligned: "Terms aligned",
        verified: "Verified",
        cancelled: "Cancelled",
    };

    return (isArabic.value ? ar : en)[status] ?? status;
}

function statusClass(status) {
    if (status === "verified") return "verified";
    if (status === "clarification_required") return "danger";
    if (status === "aligned") return "aligned";
    if (status === "active") return "active";
    return "pending";
}

function fieldLabel(field) {
    const ar = {
        price: "السعر",
        quantity: "الكمية",
        date: "التسليم",
        installation: "التركيب",
    };
    const en = {
        price: "Price",
        quantity: "Quantity",
        date: "Delivery",
        installation: "Installation",
    };

    return (isArabic.value ? ar : en)[field] ?? field;
}

function formatTerm(field, value) {
    if (value === undefined || value === null || value === "") return "—";
    if (field === "price") return `$${Number(value).toLocaleString()}`;
    if (field === "quantity") return isArabic.value ? `${value} وحدة` : `${value} units`;
    if (field === "installation") {
        if (isArabic.value) return value === "Included" ? "مشمول" : "غير مشمول";
        return value;
    }
    if (field === "date") {
        const date = new Date(`${value}T00:00:00`);
        if (!Number.isNaN(date.getTime())) {
            return new Intl.DateTimeFormat(isArabic.value ? "ar-SA" : "en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }).format(date);
        }
    }
    return value;
}

function formatTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(isArabic.value ? "ar-SA" : "en-GB", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function publicAgreementUrl(session) {
    if (!session?.agreement_public_id) return null;
    return `${window.location.origin}/agreement/${session.agreement_public_id}`;
}

onMounted(async () => {
    await loadOverview();
    refreshTimer = window.setInterval(loadOverview, 5000);
});

onUnmounted(() => {
    if (refreshTimer) window.clearInterval(refreshTimer);
});
</script>

<template>
    <section class="whatsapp-page">
        <div class="whatsapp-status-grid">
            <article class="whatsapp-kpi">
                <div class="whatsapp-kpi-icon">WA</div>
                <div>
                    <span>{{ isArabic ? "حالة واتساب" : "WhatsApp status" }}</span>
                    <strong :class="connected ? 'text-success' : 'text-danger'">
                        {{ connected ? (isArabic ? "متصل" : "Connected") : (isArabic ? "غير مهيأ" : "Not configured") }}
                    </strong>
                </div>
            </article>

            <article class="whatsapp-kpi">
                <div class="whatsapp-kpi-icon active">◉</div>
                <div>
                    <span>{{ isArabic ? "الجلسات النشطة" : "Active sessions" }}</span>
                    <strong>{{ stats.active_sessions ?? 0 }}</strong>
                </div>
            </article>

            <article class="whatsapp-kpi">
                <div class="whatsapp-kpi-icon voice">◌</div>
                <div>
                    <span>{{ isArabic ? "الملاحظات الصوتية" : "Voice notes" }}</span>
                    <strong>{{ stats.voice_notes ?? 0 }}</strong>
                </div>
            </article>

            <article class="whatsapp-kpi">
                <div class="whatsapp-kpi-icon conflict">!</div>
                <div>
                    <span>{{ isArabic ? "جلسات بها تعارض" : "Conflict sessions" }}</span>
                    <strong>{{ stats.conflict_sessions ?? 0 }}</strong>
                </div>
            </article>
        </div>

        <div class="whatsapp-setup-panel">
            <div class="whatsapp-setup-copy">
                <div class="panel-kicker">{{ isArabic ? "TWILIO WEBHOOK" : "TWILIO WEBHOOK" }}</div>
                <h2>{{ isArabic ? "ربط WhatsApp Sandbox" : "Connect WhatsApp Sandbox" }}</h2>
                <p>
                    {{ isArabic
                        ? "ضع رابط الـWebhook التالي في إعدادات Twilio WhatsApp ثم أرسل START من واتساب لبدء اتفاق جديد."
                        : "Use this webhook in Twilio WhatsApp settings, then send START from WhatsApp to create a new agreement." }}
                </p>
            </div>

            <div class="whatsapp-webhook-box">
                <code>{{ connection.webhook_url || "/api/webhooks/whatsapp" }}</code>
                <button type="button" @click="copyWebhook">
                    {{ copied ? (isArabic ? "تم النسخ" : "Copied") : (isArabic ? "نسخ" : "Copy") }}
                </button>
            </div>

            <div class="whatsapp-capabilities">
                <span :class="{ ready: connection.twilio_configured }">✓ Twilio</span>
                <span :class="{ ready: connection.assemblyai_configured }">✓ AssemblyAI</span>
                <span class="ready">✓ Text</span>
                <span class="ready">✓ Voice notes</span>
                <span class="ready">✓ Conflict detection</span>
            </div>
        </div>

        <div class="whatsapp-command-grid">
            <article>
                <span>01</span>
                <strong>{{ isArabic ? "ابدأ جلسة" : "Start a session" }}</strong>
                <code>START</code>
                <p>{{ isArabic ? "يرسلها الطرف أ ويحصل على كود MLW." : "Party A sends it and receives an MLW session code." }}</p>
            </article>
            <article>
                <span>02</span>
                <strong>{{ isArabic ? "انضم للجلسة" : "Join the session" }}</strong>
                <code>JOIN MLW-XXXXXX</code>
                <p>{{ isArabic ? "يرسلها الطرف ب باستخدام الكود." : "Party B sends it using the shared code." }}</p>
            </article>
            <article>
                <span>03</span>
                <strong>{{ isArabic ? "أرسل الشروط" : "Send agreement terms" }}</strong>
                <code>Text / Voice Note</code>
                <p>{{ isArabic ? "MeaningLock يستخرج السعر والكمية والتاريخ والتركيب." : "MeaningLock extracts price, quantity, date and installation." }}</p>
            </article>
            <article>
                <span>04</span>
                <strong>{{ isArabic ? "أكد الاتفاق" : "Confirm agreement" }}</strong>
                <code>CONFIRM MLW-XXXXXX</code>
                <p>{{ isArabic ? "بعد تطابق الشروط يؤكد الطرفان ويتم إنشاء اتفاق موثق." : "After terms align, both parties confirm and a verified agreement is created." }}</p>
            </article>
        </div>

        <div v-if="error" class="whatsapp-error-state">
            <strong>{{ isArabic ? "تعذر تحميل بيانات واتساب" : "Could not load WhatsApp data" }}</strong>
            <span>{{ error }}</span>
            <button type="button" @click="loadOverview">{{ isArabic ? "إعادة المحاولة" : "Retry" }}</button>
        </div>

        <div class="whatsapp-workspace">
            <section class="whatsapp-panel">
                <header class="whatsapp-panel-head">
                    <div>
                        <div class="panel-kicker">{{ isArabic ? "الجلسات" : "SESSIONS" }}</div>
                        <h2>{{ isArabic ? "اتفاقات واتساب" : "WhatsApp Agreements" }}</h2>
                    </div>
                    <button class="whatsapp-refresh" type="button" :disabled="loading" @click="loadOverview">↻</button>
                </header>

                <div v-if="loading && !sessions.length" class="whatsapp-empty-state">
                    {{ isArabic ? "جاري تحميل الجلسات..." : "Loading sessions..." }}
                </div>

                <div v-else-if="!sessions.length" class="whatsapp-empty-state">
                    <strong>{{ isArabic ? "لا توجد جلسات بعد" : "No sessions yet" }}</strong>
                    <span>{{ isArabic ? "أرسل START من WhatsApp بعد ربط Webhook." : "Send START from WhatsApp after connecting the webhook." }}</span>
                </div>

                <div v-else class="whatsapp-session-list">
                    <article v-for="session in sessions" :key="session.id" class="whatsapp-session-card">
                        <div class="whatsapp-session-top">
                            <div>
                                <span class="agreement-reference">{{ session.code }}</span>
                                <strong>{{ statusLabel(session.status) }}</strong>
                            </div>
                            <span class="whatsapp-status-pill" :class="statusClass(session.status)">
                                {{ statusLabel(session.status) }}
                            </span>
                        </div>

                        <div class="whatsapp-party-row">
                            <div><span>A</span><strong>{{ session.party_a_phone || "—" }}</strong></div>
                            <div><span>B</span><strong>{{ session.party_b_phone || "—" }}</strong></div>
                        </div>

                        <div class="whatsapp-terms-mini">
                            <div v-for="field in ['price', 'quantity', 'date', 'installation']" :key="field">
                                <span>{{ fieldLabel(field) }}</span>
                                <strong>{{ formatTerm(field, session.party_a_terms?.[field]) }}</strong>
                            </div>
                        </div>

                        <div v-if="session.conflicts?.length" class="whatsapp-conflict-mini">
                            <strong>⚠ {{ isArabic ? "تعارض مكتشف" : "Conflict detected" }}</strong>
                            <span v-for="conflict in session.conflicts" :key="conflict.field">
                                {{ fieldLabel(conflict.field) }}:
                                A {{ formatTerm(conflict.field, conflict.a) }} ≠
                                B {{ formatTerm(conflict.field, conflict.b) }}
                            </span>
                        </div>

                        <footer class="whatsapp-session-footer">
                            <span>{{ formatTime(session.last_activity_at) }}</span>
                            <a
                                v-if="publicAgreementUrl(session)"
                                :href="publicAgreementUrl(session)"
                                target="_blank"
                                rel="noopener"
                            >{{ isArabic ? "عرض الاتفاق" : "View agreement" }} ↗</a>
                        </footer>
                    </article>
                </div>
            </section>

            <section class="whatsapp-panel">
                <header class="whatsapp-panel-head">
                    <div>
                        <div class="panel-kicker">{{ isArabic ? "تغذية مباشرة" : "LIVE FEED" }}</div>
                        <h2>{{ isArabic ? "أحدث رسائل واتساب" : "Recent WhatsApp Messages" }}</h2>
                    </div>
                    <span class="whatsapp-message-count">{{ stats.messages ?? 0 }}</span>
                </header>

                <div v-if="!messages.length" class="whatsapp-empty-state">
                    {{ isArabic ? "لا توجد رسائل بعد." : "No messages yet." }}
                </div>

                <div v-else class="whatsapp-message-feed">
                    <article v-for="message in messages" :key="message.id" class="whatsapp-message-item">
                        <div class="whatsapp-message-icon" :class="message.direction">
                            {{ message.type === 'audio' ? '◌' : (message.direction === 'outbound' ? '↗' : (message.speaker || '•')) }}
                        </div>
                        <div class="whatsapp-message-copy">
                            <div>
                                <strong>
                                    {{ message.session_code || (isArabic ? "بدون جلسة" : "No session") }}
                                    <template v-if="message.speaker"> • {{ isArabic ? "المتحدث" : "Speaker" }} {{ message.speaker }}</template>
                                </strong>
                                <time>{{ formatTime(message.created_at) }}</time>
                            </div>
                            <p>{{ message.preview || (message.type === 'audio' ? (isArabic ? 'رسالة صوتية' : 'Voice note') : '—') }}</p>
                            <span>{{ message.type }} • {{ message.status }}</span>
                        </div>
                    </article>
                </div>
            </section>
        </div>
    </section>
</template>
