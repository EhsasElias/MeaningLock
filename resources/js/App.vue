<script setup>
import { onMounted, provide } from "vue";
import { createMeaningLockStore } from "./stores/meaningLockStore";

import LivePage from "./pages/LivePage.vue";
import AgreementsPage from "./pages/AgreementsPage.vue";
import ActivityPage from "./pages/ActivityPage.vue";
import ReportsPage from "./pages/ReportsPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";

const app = createMeaningLockStore();
provide("meaningLock", app);

const {
    locale,
    isArabic,
    t,
    changeLanguage,
    currentPage,
    pageEyebrow,
    pageTitle,
    pageDescription,
    statusClass,
    translatedStatus,
    openLivePage,
    openAgreementsPage,
    openActivityPage,
    openReportsPage,
    openSettingsPage,
    loadAgreements,
    clearSession,
    initializeApp,
} = app;

onMounted(initializeApp);
</script>

<template>
    <div class="app-shell" :dir="isArabic ? 'rtl' : 'ltr'" :lang="locale">
        <div class="ambient ambient-one"></div>
        <div class="ambient ambient-two"></div>

        <aside class="sidebar">
            <div class="brand">
                <div class="brand-orb"><div class="brand-orb-core">M</div></div>
                <div class="brand-copy">
                    <strong>MeaningLock</strong>
                    <span>{{ t("brandSubtitle") }}</span>
                </div>
            </div>

            <nav class="navigation">
                <button class="nav-item" :class="{ active: currentPage === 'live' }" @click="openLivePage">
                    <span class="nav-icon">◈</span><span>{{ t("navLive") }}</span>
                </button>
                <button class="nav-item" :class="{ active: currentPage === 'agreements' }" @click="openAgreementsPage">
                    <span class="nav-icon">◇</span><span>{{ t("navAgreements") }}</span>
                </button>
                <button class="nav-item" :class="{ active: currentPage === 'activity' }" @click="openActivityPage">
                    <span class="nav-icon">⌁</span><span>{{ t("navActivity") }}</span>
                </button>
                <button class="nav-item" :class="{ active: currentPage === 'reports' }" @click="openReportsPage">
                    <span class="nav-icon">◫</span><span>{{ t("navReports") }}</span>
                </button>
                <button class="nav-item" :class="{ active: currentPage === 'settings' }" @click="openSettingsPage">
                    <span class="nav-icon">⚙</span><span>{{ t("navSettings") }}</span>
                </button>
            </nav>

            <div class="sidebar-bottom">
                <div class="powered-card">
                    <div class="powered-symbol">✦</div>
                    <div><span>{{ t("voiceIntelligence") }}</span><strong>AssemblyAI</strong></div>
                </div>
                <div class="profile-card">
                    <div class="profile-avatar">EA</div>
                    <div><strong>Ehsas Al azazy</strong><span>{{ t("workspaceOwner") }}</span></div>
                </div>
            </div>
        </aside>

        <main class="main">
            <header class="topbar">
                <div>
                    <div class="eyebrow">{{ pageEyebrow }}</div>
                    <h1>{{ pageTitle }}</h1>
                    <p>{{ pageDescription }}</p>
                </div>

                <div class="top-actions">
                    <div class="language-switcher">
                        <button :class="{ active: locale === 'en' }" @click="changeLanguage('en')">EN</button>
                        <button :class="{ active: locale === 'ar' }" @click="changeLanguage('ar')">عربي</button>
                    </div>

                    <div v-if="currentPage === 'live'" class="session-status" :class="statusClass">
                        <span class="status-dot"></span>{{ translatedStatus }}
                    </div>

                    <button
                        v-if="['agreements', 'activity', 'reports'].includes(currentPage)"
                        class="ghost-icon-button"
                        type="button"
                        :title="isArabic ? 'تحديث البيانات' : 'Refresh data'"
                        @click="loadAgreements"
                    >↻</button>

                    <button v-if="currentPage === 'live'" class="ghost-icon-button" :title="t('resetSession')" @click="clearSession">↻</button>
                </div>
            </header>

            <LivePage v-if="currentPage === 'live'" />
            <AgreementsPage v-else-if="currentPage === 'agreements'" />
            <ActivityPage v-else-if="currentPage === 'activity'" />
            <ReportsPage v-else-if="currentPage === 'reports'" />
            <SettingsPage v-else-if="currentPage === 'settings'" />
        </main>
    </div>
</template>

<style src="./styles/meaninglock.css"></style>
