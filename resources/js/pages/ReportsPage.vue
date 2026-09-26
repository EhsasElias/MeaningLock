<script setup>
import { inject } from "vue";

const {
    isArabic,
    t,
    agreements,
    loadingAgreements,
    agreementsError,
    reportRange,
    reportAgreements,
    reportVerifiedCount,
    reportTotalValue,
    reportAverageValue,
    reportConflictAgreements,
    reportConflictEvents,
    reportResolvedConflictAgreements,
    reportConflictRate,
    reportUpdateEvents,
    reportFieldSeries,
    reportTopUpdatedField,
    reportDailySeries,
    reportRecentAgreements,
    reportVerificationRate,
    loadAgreements,
    openAgreementFromReport,
    agreementReference,
    formatAgreementDate,
    formatAgreementMoney,
    formatField
} = inject("meaningLock");
</script>

<template>
<section class="reports-toolbar">
    <div class="reports-range-copy">
        <span class="panel-kicker">
            {{ isArabic ? "نطاق التقرير" : "REPORT RANGE" }}
        </span>
        <strong>
            {{
                isArabic
                    ? "تحليلات مباشرة من الاتفاقات المحفوظة"
                    : "Live analytics from saved agreements"
            }}
        </strong>
    </div>

    <div class="reports-range-tabs">
        <button
            type="button"
            :class="{ active: reportRange === 'today' }"
            @click="reportRange = 'today'"
        >
            {{ isArabic ? "اليوم" : "Today" }}
        </button>
        <button
            type="button"
            :class="{ active: reportRange === '7d' }"
            @click="reportRange = '7d'"
        >
            {{ isArabic ? "7 أيام" : "7 days" }}
        </button>
        <button
            type="button"
            :class="{ active: reportRange === '30d' }"
            @click="reportRange = '30d'"
        >
            {{ isArabic ? "30 يوم" : "30 days" }}
        </button>
        <button
            type="button"
            :class="{ active: reportRange === 'all' }"
            @click="reportRange = 'all'"
        >
            {{ isArabic ? "الكل" : "All time" }}
        </button>
    </div>
</section>

<div v-if="loadingAgreements" class="reports-state">
    <div class="agreements-loader"></div>
    <strong>{{ isArabic ? "جارٍ تجهيز التقارير..." : "Preparing reports..." }}</strong>
</div>

<div v-else-if="agreementsError" class="reports-state error">
    <div class="agreements-error-icon">!</div>
    <strong>{{ isArabic ? "تعذر تحميل التقارير" : "Could not load reports" }}</strong>
    <span>{{ agreementsError }}</span>
    <button type="button" @click="loadAgreements">
        {{ isArabic ? "إعادة المحاولة" : "Try again" }}
    </button>
</div>

<template v-else>
    <section class="reports-kpi-grid">
        <article class="reports-kpi-card">
            <div class="reports-kpi-icon purple">◇</div>
            <div>
                <span>{{ isArabic ? "إجمالي الاتفاقات" : "Total agreements" }}</span>
                <strong>{{ reportAgreements.length }}</strong>
                <small>
                    {{ reportVerificationRate }}%
                    {{ isArabic ? "نسبة التوثيق" : "verification rate" }}
                </small>
            </div>
        </article>

        <article class="reports-kpi-card">
            <div class="reports-kpi-icon green">✓</div>
            <div>
                <span>{{ isArabic ? "الاتفاقات الموثقة" : "Verified agreements" }}</span>
                <strong>{{ reportVerifiedCount }}</strong>
                <small>
                    {{ isArabic ? "تم تأكيدها من الطرفين" : "confirmed by both parties" }}
                </small>
            </div>
        </article>

        <article class="reports-kpi-card">
            <div class="reports-kpi-icon cyan">$</div>
            <div>
                <span>{{ isArabic ? "إجمالي قيمة الاتفاقات" : "Total agreement value" }}</span>
                <strong class="money">{{ formatAgreementMoney(reportTotalValue) }}</strong>
                <small>
                    {{ isArabic ? "متوسط" : "Avg" }}
                    {{ formatAgreementMoney(reportAverageValue) }}
                </small>
            </div>
        </article>

        <article class="reports-kpi-card">
            <div class="reports-kpi-icon red">!</div>
            <div>
                <span>{{ isArabic ? "اتفاقات بها تعارض" : "Agreements with conflict" }}</span>
                <strong>{{ reportConflictAgreements.length }}</strong>
                <small>{{ reportConflictRate }}% {{ isArabic ? "من الاتفاقات" : "of agreements" }}</small>
            </div>
        </article>

        <article class="reports-kpi-card">
            <div class="reports-kpi-icon amber">↻</div>
            <div>
                <span>{{ isArabic ? "أحداث التعارض" : "Conflict events" }}</span>
                <strong>{{ reportConflictEvents }}</strong>
                <small>
                    {{ reportUpdateEvents.length }}
                    {{ isArabic ? "تحديثات شروط" : "term updates" }}
                </small>
            </div>
        </article>

        <article class="reports-kpi-card">
            <div class="reports-kpi-icon green">◎</div>
            <div>
                <span>{{ isArabic ? "تعارضات انتهت باتفاق موثق" : "Conflict agreements resolved" }}</span>
                <strong>{{ reportResolvedConflictAgreements }}</strong>
                <small>
                    {{ isArabic ? "تم الوصول إلى اتفاق نهائي موثق" : "finished as verified agreements" }}
                </small>
            </div>
        </article>
    </section>

    <section class="reports-chart-grid">
        <article class="report-panel report-trend-panel">
            <div class="report-panel-head">
                <div>
                    <span class="panel-kicker">
                        {{ isArabic ? "الاتجاه" : "TREND" }}
                    </span>
                    <h2>{{ isArabic ? "الاتفاقات حسب اليوم" : "Agreements by day" }}</h2>
                </div>
                <span>{{ reportAgreements.length }}</span>
            </div>

            <div v-if="!reportDailySeries.length" class="report-empty">
                {{ isArabic ? "لا توجد بيانات ضمن الفترة المحددة." : "No data in the selected range." }}
            </div>

            <div v-else class="daily-chart">
                <div
                    v-for="day in reportDailySeries"
                    :key="day.key"
                    class="daily-chart-column"
                >
                    <div class="daily-chart-value">{{ day.count }}</div>
                    <div class="daily-chart-track">
                        <div
                            class="daily-chart-bar"
                            :style="{ height: `${day.countPercent}%` }"
                        ></div>
                    </div>
                    <span>{{ day.label }}</span>
                </div>
            </div>
        </article>

        <article class="report-panel report-field-panel">
            <div class="report-panel-head">
                <div>
                    <span class="panel-kicker">
                        {{ isArabic ? "نشاط الحل" : "RESOLUTION ACTIVITY" }}
                    </span>
                    <h2>{{ isArabic ? "تحديثات الشروط حسب الحقل" : "Term updates by field" }}</h2>
                </div>
                <span>{{ reportUpdateEvents.length }}</span>
            </div>

            <div class="field-report-list">
                <div
                    v-for="item in reportFieldSeries"
                    :key="item.field"
                    class="field-report-row"
                >
                    <div class="field-report-label">
                        <span>{{ formatField(item.field) }}</span>
                        <strong>{{ item.count }}</strong>
                    </div>
                    <div class="field-report-track">
                        <div
                            class="field-report-bar"
                            :style="{ width: `${item.percent}%` }"
                        ></div>
                    </div>
                </div>
            </div>

            <div class="report-insight">
                <span>✦</span>
                <div>
                    <small>{{ isArabic ? "أكثر حقل تم تعديله" : "Most updated field" }}</small>
                    <strong>
                        {{
                            reportTopUpdatedField
                                ? formatField(reportTopUpdatedField.field)
                                : isArabic
                                  ? "لا توجد تعديلات بعد"
                                  : "No updates yet"
                        }}
                    </strong>
                </div>
            </div>
        </article>
    </section>

    <section class="reports-bottom-grid">
        <article class="report-panel report-value-panel">
            <div class="report-panel-head">
                <div>
                    <span class="panel-kicker">
                        {{ isArabic ? "القيمة" : "VALUE" }}
                    </span>
                    <h2>{{ isArabic ? "قيمة الاتفاقات عبر الوقت" : "Agreement value over time" }}</h2>
                </div>
                <strong>{{ formatAgreementMoney(reportTotalValue) }}</strong>
            </div>

            <div v-if="!reportDailySeries.length" class="report-empty">
                {{ isArabic ? "لا توجد بيانات قيمة بعد." : "No value data yet." }}
            </div>

            <div v-else class="value-chart-list">
                <div
                    v-for="day in reportDailySeries"
                    :key="`value-${day.key}`"
                    class="value-chart-row"
                >
                    <span>{{ day.label }}</span>
                    <div class="value-chart-track">
                        <div
                            class="value-chart-bar"
                            :style="{ width: `${day.valuePercent}%` }"
                        ></div>
                    </div>
                    <strong>{{ formatAgreementMoney(day.value) }}</strong>
                </div>
            </div>
        </article>

        <article class="report-panel report-recent-panel">
            <div class="report-panel-head">
                <div>
                    <span class="panel-kicker">
                        {{ isArabic ? "الأحدث" : "RECENT" }}
                    </span>
                    <h2>{{ isArabic ? "أحدث الاتفاقات" : "Recent agreements" }}</h2>
                </div>
            </div>

            <div v-if="!reportRecentAgreements.length" class="report-empty">
                {{ isArabic ? "لا توجد اتفاقات في هذه الفترة." : "No agreements in this period." }}
            </div>

            <div v-else class="report-recent-list">
                <button
                    v-for="agreement in reportRecentAgreements"
                    :key="agreement.id"
                    type="button"
                    class="report-recent-item"
                    @click="openAgreementFromReport(agreement)"
                >
                    <div>
                        <strong>{{ agreementReference(agreement) }}</strong>
                        <span>{{ formatAgreementDate(agreement.verified_at ?? agreement.created_at) }}</span>
                    </div>
                    <div>
                        <strong>{{ formatAgreementMoney(agreement.price) }}</strong>
                        <span>{{ agreement.quantity ?? "—" }} {{ t("units") }}</span>
                    </div>
                    <span class="report-recent-arrow">↗</span>
                </button>
            </div>
        </article>
    </section>
</template>
</template>
