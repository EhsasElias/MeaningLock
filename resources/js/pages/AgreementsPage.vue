<script setup>
import { inject } from "vue";

const {
    isArabic,
    t,
    speakerA,
    speakerB,
    timeline,
    agreements,
    loadingAgreements,
    agreementsError,
    selectedAgreement,
    loadingAgreement,
    agreementSearch,
    agreementStatusFilter,
    copiedAgreementId,
    fields,
    filteredAgreements,
    verifiedAgreementsCount,
    agreementsTotalValue,
    openLivePage,
    loadAgreements,
    openAgreement,
    closeAgreement,
    agreementReference,
    agreementTermValue,
    agreementTranscript,
    agreementTimeline,
    formatAgreementDate,
    formatAgreementMoney,
    copyAgreementPublicLink,
    openPublicAgreement,
    speakerName,
    formatField,
    formatValue
} = inject("meaningLock");
</script>

<template>
<section class="agreements-overview-grid">
    <article class="agreements-overview-card">
        <div class="agreements-overview-icon">◇</div>
        <div>
            <span>
                {{ isArabic ? "إجمالي الاتفاقات" : "Total agreements" }}
            </span>
            <strong>{{ agreements.length }}</strong>
        </div>
    </article>

    <article class="agreements-overview-card">
        <div class="agreements-overview-icon verified">✓</div>
        <div>
            <span>
                {{ isArabic ? "اتفاقات موثقة" : "Verified" }}
            </span>
            <strong>{{ verifiedAgreementsCount }}</strong>
        </div>
    </article>

    <article class="agreements-overview-card wide-value">
        <div class="agreements-overview-icon value">$</div>
        <div>
            <span>
                {{ isArabic ? "إجمالي قيمة الاتفاقات" : "Total agreement value" }}
            </span>
            <strong>{{ formatAgreementMoney(agreementsTotalValue) }}</strong>
        </div>
    </article>
</section>

<section class="agreements-toolbar">
    <div class="agreement-search-box">
        <span>⌕</span>
        <input
            v-model="agreementSearch"
            type="search"
            :placeholder="
                isArabic
                    ? 'ابحث بالرقم أو السعر أو التاريخ...'
                    : 'Search ID, price, delivery date...'
            "
        />
    </div>

    <div class="agreement-filter-tabs">
        <button
            type="button"
            :class="{ active: agreementStatusFilter === 'all' }"
            @click="agreementStatusFilter = 'all'"
        >
            {{ isArabic ? "الكل" : "All" }}
        </button>

        <button
            type="button"
            :class="{ active: agreementStatusFilter === 'verified' }"
            @click="agreementStatusFilter = 'verified'"
        >
            {{ isArabic ? "موثقة" : "Verified" }}
        </button>
    </div>

    <button
        type="button"
        class="agreements-refresh-button"
        :disabled="loadingAgreements"
        @click="loadAgreements"
    >
        <span :class="{ spinning: loadingAgreements }">↻</span>
        {{ isArabic ? "تحديث" : "Refresh" }}
    </button>
</section>

<section
    class="agreements-workspace"
    :class="{ 'detail-open': selectedAgreement }"
>
    <div class="agreements-list-panel">
        <div class="agreements-list-head">
            <div>
                <span class="panel-kicker">
                    {{ isArabic ? "الأرشيف" : "AGREEMENT VAULT" }}
                </span>
                <h2>
                    {{ isArabic ? "الاتفاقات المحفوظة" : "Saved agreements" }}
                </h2>
            </div>

            <span class="agreement-result-count">
                {{ filteredAgreements.length }}
                {{ isArabic ? "نتيجة" : "results" }}
            </span>
        </div>

        <div v-if="loadingAgreements" class="agreements-loading-state">
            <div class="agreements-loader"></div>
            <strong>
                {{ isArabic ? "جارٍ تحميل الاتفاقات..." : "Loading agreements..." }}
            </strong>
        </div>

        <div v-else-if="agreementsError" class="agreements-error-state">
            <div class="agreements-error-icon">!</div>
            <div>
                <strong>
                    {{ isArabic ? "تعذر تحميل الاتفاقات" : "Could not load agreements" }}
                </strong>
                <span>{{ agreementsError }}</span>
            </div>
            <button type="button" @click="loadAgreements">
                {{ isArabic ? "إعادة المحاولة" : "Retry" }}
            </button>
        </div>

        <div
            v-else-if="!filteredAgreements.length"
            class="agreements-empty-state"
        >
            <div class="agreements-empty-icon">◇</div>
            <strong>
                {{
                    agreements.length
                        ? isArabic
                            ? "لا توجد نتائج مطابقة"
                            : "No matching agreements"
                        : isArabic
                          ? "لا توجد اتفاقات محفوظة بعد"
                          : "No saved agreements yet"
                }}
            </strong>
            <span>
                {{
                    agreements.length
                        ? isArabic
                            ? "جرّب تغيير البحث أو الفلتر."
                            : "Try another search or filter."
                        : isArabic
                          ? "سيظهر أي اتفاق موثق هنا تلقائياً."
                          : "Verified agreements will appear here automatically."
                }}
            </span>
            <button
                v-if="!agreements.length"
                type="button"
                @click="openLivePage"
            >
                {{ isArabic ? "بدء محادثة" : "Start a conversation" }}
            </button>
        </div>

        <div v-else class="agreement-card-list">
            <article
                v-for="agreement in filteredAgreements"
                :key="agreement.id"
                class="agreement-record-card"
                :class="{
                    selected:
                        selectedAgreement &&
                        selectedAgreement.id === agreement.id,
                }"
                @click="openAgreement(agreement)"
            >
                <div class="agreement-record-top">
                    <div>
                        <span class="agreement-reference">
                            {{ agreementReference(agreement) }}
                        </span>
                        <strong>
                            {{ formatAgreementMoney(agreement.price) }}
                        </strong>
                    </div>

                    <span class="agreement-verified-pill">
                        ✓ {{ isArabic ? "موثق" : "Verified" }}
                    </span>
                </div>

                <div class="agreement-record-terms">
                    <div>
                        <span>{{ isArabic ? "الكمية" : "Quantity" }}</span>
                        <strong>
                            {{ agreement.quantity ?? "—" }}
                            {{ agreement.quantity ? t("units") : "" }}
                        </strong>
                    </div>

                    <div>
                        <span>{{ isArabic ? "التسليم" : "Delivery" }}</span>
                        <strong>{{ agreement.delivery_date ?? "—" }}</strong>
                    </div>

                    <div>
                        <span>{{ isArabic ? "التركيب" : "Installation" }}</span>
                        <strong>
                            {{
                                agreement.installation === "Included"
                                    ? t("included")
                                    : agreement.installation === "Excluded"
                                      ? t("excluded")
                                      : agreement.installation ?? "—"
                            }}
                        </strong>
                    </div>
                </div>

                <div class="agreement-record-footer">
                    <span>
                        {{
                            formatAgreementDate(
                                agreement.verified_at ?? agreement.created_at,
                            )
                        }}
                    </span>

                    <button type="button">
                        {{ isArabic ? "عرض التفاصيل" : "View details" }}
                        <span>→</span>
                    </button>
                </div>
            </article>
        </div>
    </div>

    <aside v-if="selectedAgreement" class="agreement-detail-panel">
        <div class="agreement-detail-header">
            <div>
                <span class="panel-kicker">
                    {{ isArabic ? "تفاصيل الاتفاق" : "AGREEMENT DETAILS" }}
                </span>
                <h2>{{ agreementReference(selectedAgreement) }}</h2>
                <p>
                    {{
                        formatAgreementDate(
                            selectedAgreement.verified_at ??
                                selectedAgreement.created_at,
                            true,
                        )
                    }}
                </p>
            </div>

            <button
                type="button"
                class="agreement-detail-close"
                @click="closeAgreement"
            >
                ×
            </button>
        </div>

        <div v-if="loadingAgreement" class="agreement-detail-loading">
            <div class="agreements-loader"></div>
        </div>

        <template v-else>
            <div class="agreement-detail-verified">
                <div class="agreement-detail-check">✓</div>
                <div>
                    <strong>
                        {{ isArabic ? "اتفاق موثق" : "Verified Agreement" }}
                    </strong>
                    <span>
                        {{
                            isArabic
                                ? "تم تأكيد الشروط نفسها من كلا الطرفين."
                                : "Both parties confirmed the same final terms."
                        }}
                    </span>
                </div>
            </div>

            <div class="agreement-detail-section">
                <div class="agreement-section-title">
                    <span>{{ isArabic ? "الشروط النهائية" : "Final terms" }}</span>
                </div>

                <div class="agreement-detail-terms">
                    <div
                        v-for="field in fields"
                        :key="`detail-${field}`"
                        class="agreement-detail-term"
                    >
                        <span>{{ formatField(field) }}</span>
                        <strong>
                            {{
                                agreementTermValue(selectedAgreement, field) !==
                                undefined
                                    ? formatValue(
                                          field,
                                          agreementTermValue(
                                              selectedAgreement,
                                              field,
                                          ),
                                      )
                                    : "—"
                            }}
                        </strong>
                    </div>
                </div>
            </div>

            <div class="agreement-detail-section">
                <div class="agreement-section-title">
                    <span>{{ isArabic ? "تم التأكيد بواسطة" : "Confirmed by" }}</span>
                </div>

                <div class="agreement-confirmation-row">
                    <span
                        :class="{
                            confirmed: selectedAgreement.speaker_a_confirmed,
                        }"
                    >
                        ✓ {{ t("speakerA") }}
                    </span>
                    <span
                        :class="{
                            confirmed: selectedAgreement.speaker_b_confirmed,
                        }"
                    >
                        ✓ {{ t("speakerB") }}
                    </span>
                </div>
            </div>

            <div class="agreement-detail-section">
                <div class="agreement-section-title">
                    <span>
                        {{ isArabic ? "دليل المحادثة" : "Conversation evidence" }}
                    </span>
                    <small>{{ agreementTranscript(selectedAgreement).length }}</small>
                </div>

                <div
                    v-if="agreementTranscript(selectedAgreement).length"
                    class="agreement-evidence-list"
                >
                    <article
                        v-for="(turn, index) in agreementTranscript(
                            selectedAgreement,
                        )"
                        :key="turn.id ?? index"
                        class="agreement-evidence-turn"
                        :class="{
                            'speaker-a-evidence': turn.speaker === 'A',
                            'speaker-b-evidence': turn.speaker === 'B',
                        }"
                    >
                        <div>
                            <span
                                class="speaker-avatar"
                                :class="
                                    turn.speaker === 'A'
                                        ? 'speaker-a'
                                        : 'speaker-b'
                                "
                            >
                                {{ turn.speaker ?? "•" }}
                            </span>
                            <strong>
                                {{
                                    turn.speaker
                                        ? speakerName(turn.speaker)
                                        : isArabic
                                          ? "محادثة"
                                          : "Conversation"
                                }}
                            </strong>
                            <time>{{ turn.time ?? "" }}</time>
                        </div>
                        <p dir="auto">{{ turn.text ?? "" }}</p>
                    </article>
                </div>

                <div v-else class="agreement-no-evidence">
                    {{
                        isArabic
                            ? "لا يوجد نص محادثة محفوظ لهذا الاتفاق."
                            : "No transcript evidence was saved for this agreement."
                    }}
                </div>
            </div>

            <div class="agreement-detail-section">
                <div class="agreement-section-title">
                    <span>{{ isArabic ? "السجل الزمني" : "Timeline" }}</span>
                    <small>{{ agreementTimeline(selectedAgreement).length }}</small>
                </div>

                <div
                    v-if="agreementTimeline(selectedAgreement).length"
                    class="agreement-history-mini"
                >
                    <div
                        v-for="(item, index) in agreementTimeline(
                            selectedAgreement,
                        )"
                        :key="item.id ?? index"
                        class="agreement-history-mini-item"
                    >
                        <span
                            class="agreement-history-dot"
                            :class="{ ai: item.speaker === 'AI' }"
                        ></span>
                        <div>
                            <strong>
                                {{
                                    item.type === "verified"
                                        ? isArabic
                                            ? "تم توثيق الاتفاق"
                                            : "Agreement verified"
                                        : item.type === "confirmed"
                                          ? `${
                                                item.speaker === "A"
                                                    ? t("speakerA")
                                                    : t("speakerB")
                                            } ${
                                                isArabic
                                                    ? "أكد الاتفاق"
                                                    : "confirmed"
                                            }`
                                          : item.type === "changed"
                                            ? `${
                                                  isArabic
                                                      ? "تم تحديث"
                                                      : "Updated"
                                              } ${formatField(item.field)}`
                                            : item.type === "captured"
                                              ? `${
                                                    isArabic
                                                        ? "تم التقاط"
                                                        : "Captured"
                                                } ${formatField(item.field)}`
                                              : item.type === "clarification"
                                                ? isArabic
                                                    ? "طلب MeaningLock توضيح التعارض"
                                                    : "MeaningLock requested clarification"
                                                : item.type ??
                                                  (isArabic
                                                      ? "حدث"
                                                      : "Event")
                                }}
                            </strong>
                            <span>{{ item.time ?? "" }}</span>
                        </div>
                    </div>
                </div>

                <div v-else class="agreement-no-evidence">
                    {{
                        isArabic
                            ? "لا يوجد سجل زمني محفوظ."
                            : "No timeline was saved."
                    }}
                </div>
            </div>

            <div class="agreement-detail-actions">
                <button
                    type="button"
                    class="agreement-detail-action primary"
                    @click="openPublicAgreement(selectedAgreement)"
                >
                    ↗
                    {{ isArabic ? "عرض الاتفاق العام" : "Open public agreement" }}
                </button>

                <button
                    type="button"
                    class="agreement-detail-action"
                    @click="openPublicAgreement(selectedAgreement)"
                >
                    ⇩
                    {{ isArabic ? "طباعة / حفظ PDF" : "Print / Save PDF" }}
                </button>

                <button
                    type="button"
                    class="agreement-detail-action"
                    @click="copyAgreementPublicLink(selectedAgreement)"
                >
                    {{
                        copiedAgreementId === selectedAgreement.id ? "✓" : "⧉"
                    }}
                    {{
                        copiedAgreementId === selectedAgreement.id
                            ? isArabic
                                ? "تم نسخ الرابط"
                                : "Link copied"
                            : isArabic
                              ? "نسخ رابط المشاركة"
                              : "Copy share link"
                    }}
                </button>
            </div>
        </template>
    </aside>
</section>
</template>
