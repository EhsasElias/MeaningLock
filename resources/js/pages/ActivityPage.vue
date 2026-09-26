<script setup>
import { inject } from "vue";

const {
    isArabic,
    t,
    speakerA,
    speakerB,
    confirmations,
    agreements,
    loadingAgreements,
    agreementsError,
    activitySearch,
    activityFilter,
    activityEvents,
    filteredActivityEvents,
    activityConflictCount,
    activityUpdateCount,
    activityVerifiedCount,
    activityTitle,
    activityDescription,
    activityIcon,
    activityDateLabel,
    loadAgreements,
    openActivityAgreement,
    agreementReference,
    conflicts
} = inject("meaningLock");
</script>

<template>
<section class="activity-overview-grid">
    <article class="activity-overview-card">
        <div class="activity-overview-icon">⌁</div>
        <div>
            <span>{{ isArabic ? "إجمالي الأحداث" : "Total events" }}</span>
            <strong>{{ activityEvents.length }}</strong>
        </div>
    </article>

    <article class="activity-overview-card conflict">
        <div class="activity-overview-icon conflict">!</div>
        <div>
            <span>{{ isArabic ? "التعارضات" : "Conflict events" }}</span>
            <strong>{{ activityConflictCount }}</strong>
        </div>
    </article>

    <article class="activity-overview-card update">
        <div class="activity-overview-icon update">↻</div>
        <div>
            <span>{{ isArabic ? "تحديثات الشروط" : "Term updates" }}</span>
            <strong>{{ activityUpdateCount }}</strong>
        </div>
    </article>

    <article class="activity-overview-card verified">
        <div class="activity-overview-icon verified">✓</div>
        <div>
            <span>{{ isArabic ? "اتفاقات موثقة" : "Verified" }}</span>
            <strong>{{ activityVerifiedCount }}</strong>
        </div>
    </article>
</section>

<section class="activity-toolbar">
    <label class="activity-search">
        <span>⌕</span>
        <input
            v-model="activitySearch"
            type="search"
            :placeholder="
                isArabic
                    ? 'ابحث برقم الاتفاق أو نوع الحدث...'
                    : 'Search by agreement or activity...'
            "
        />
    </label>

    <div class="activity-filters">
        <button
            type="button"
            :class="{ active: activityFilter === 'all' }"
            @click="activityFilter = 'all'"
        >
            {{ isArabic ? "الكل" : "All" }}
        </button>

        <button
            type="button"
            :class="{ active: activityFilter === 'conflicts' }"
            @click="activityFilter = 'conflicts'"
        >
            {{ isArabic ? "التعارضات" : "Conflicts" }}
        </button>

        <button
            type="button"
            :class="{ active: activityFilter === 'updates' }"
            @click="activityFilter = 'updates'"
        >
            {{ isArabic ? "التعديلات" : "Updates" }}
        </button>

        <button
            type="button"
            :class="{ active: activityFilter === 'confirmations' }"
            @click="activityFilter = 'confirmations'"
        >
            {{ isArabic ? "التأكيدات" : "Confirmations" }}
        </button>

        <button
            type="button"
            :class="{ active: activityFilter === 'verified' }"
            @click="activityFilter = 'verified'"
        >
            {{ isArabic ? "الموثقة" : "Verified" }}
        </button>
    </div>
</section>

<section class="activity-workspace">
    <div class="activity-panel-head">
        <div>
            <span class="panel-kicker">
                {{ isArabic ? "السجل المركزي" : "CENTRAL LOG" }}
            </span>
            <h2>{{ isArabic ? "آخر الأحداث" : "Recent activity" }}</h2>
        </div>

        <span class="activity-result-count">
            {{ filteredActivityEvents.length }}
            {{ isArabic ? "حدث" : "events" }}
        </span>
    </div>

    <div v-if="loadingAgreements" class="activity-state">
        <div class="agreements-loader"></div>
        <strong>{{ isArabic ? "جارٍ تحميل النشاط..." : "Loading activity..." }}</strong>
    </div>

    <div v-else-if="agreementsError" class="activity-state error">
        <div class="agreements-error-icon">!</div>
        <strong>{{ isArabic ? "تعذر تحميل النشاط" : "Could not load activity" }}</strong>
        <span>{{ agreementsError }}</span>
        <button type="button" @click="loadAgreements">
            {{ isArabic ? "إعادة المحاولة" : "Try again" }}
        </button>
    </div>

    <div v-else-if="!filteredActivityEvents.length" class="activity-state">
        <div class="activity-empty-icon">⌁</div>
        <strong>
            {{
                activityEvents.length
                    ? isArabic
                        ? "لا توجد أحداث مطابقة"
                        : "No matching activity"
                    : isArabic
                      ? "لا يوجد نشاط محفوظ بعد"
                      : "No saved activity yet"
            }}
        </strong>
        <span>
            {{
                activityEvents.length
                    ? isArabic
                        ? "جرّب تغيير البحث أو الفلتر."
                        : "Try changing the search or filter."
                    : isArabic
                      ? "سيظهر سجل الاتفاقات هنا تلقائيًا بعد حفظها."
                      : "Agreement activity will appear here automatically after agreements are saved."
            }}
        </span>
    </div>

    <div v-else class="activity-feed">
        <article
            v-for="event in filteredActivityEvents"
            :key="`${event.agreement?.id}-${event.id}`"
            class="activity-feed-item"
            :class="`activity-${event.category}`"
        >
            <div class="activity-feed-rail">
                <div
                    class="activity-feed-icon"
                    :class="event.category"
                >
                    {{ activityIcon(event) }}
                </div>
                <span></span>
            </div>

            <div class="activity-feed-content">
                <div class="activity-feed-top">
                    <div>
                        <strong>{{ activityTitle(event) }}</strong>
                        <span>{{ activityDescription(event) }}</span>
                    </div>

                    <button
                        type="button"
                        class="activity-agreement-link"
                        @click="openActivityAgreement(event)"
                    >
                        {{ event.agreementReference }}
                        <span>↗</span>
                    </button>
                </div>

                <div class="activity-feed-meta">
                    <span>{{ activityDateLabel(event) }}</span>

                    <span v-if="event.speaker && event.speaker !== 'AI'">
                        {{
                            event.speaker === "A"
                                ? t("speakerA")
                                : t("speakerB")
                        }}
                    </span>

                    <span v-if="event.speaker === 'AI'">MeaningLock AI</span>
                </div>
            </div>
        </article>
    </div>
</section>
</template>
