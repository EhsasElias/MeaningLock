<script setup>
import { inject } from "vue";

const {
    settings,
    saveVerifiedAgreement,
    isArabic,
    t,
    status,
    transcriptTurns,
    partialTranscript,
    currentSpeaker,
    speakerA,
    speakerB,
    confirmations,
    timeline,
    clarificationMessage,
    savedAgreement,
    savingAgreement,
    saveAgreementError,
    shareCopied,
    isAiSpeaking,
    fields,
    selectSpeaker,
    speakerName,
    startConversation,
    conflicts,
    speakerAComplete,
    speakerBComplete,
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
    askForClarification,
    retrySaveAgreement,
    copyShareLink,
    confirmParty,
    stopConversation
} = inject("meaningLock");
</script>

<template>
<!-- =================================================
     METRICS
     ================================================= -->

<section class="metric-grid">
    <!-- Health -->

    <article class="metric-card">
        <div class="metric-light metric-purple"></div>

        <div class="metric-icon">◎</div>

        <div class="metric-copy">
            <span>
                {{ t("agreementHealth") }}
            </span>

            <strong> {{ agreementScore }}% </strong>
        </div>

        <div
            class="metric-trend"
            :class="{
                positive:
                    agreementScore === 100 && !conflicts.length,
            }"
        >
            {{ agreementState }}
        </div>
    </article>

    <!-- Conflicts -->

    <article class="metric-card">
        <div class="metric-light metric-red"></div>

        <div class="metric-icon">⚡</div>

        <div class="metric-copy">
            <span>
                {{ t("conflicts") }}
            </span>

            <strong>
                {{ conflicts.length }}
            </strong>
        </div>

        <div
            class="metric-trend"
            :class="{
                danger: conflicts.length,
            }"
        >
            {{ conflicts.length ? t("review") : t("clear") }}
        </div>
    </article>

    <!-- Commitments -->

    <article class="metric-card">
        <div class="metric-light metric-cyan"></div>

        <div class="metric-icon">◇</div>

        <div class="metric-copy">
            <span>
                {{ t("commitments") }}
            </span>

            <strong>
                {{ detectedCommitments }}
            </strong>
        </div>

        <div class="metric-trend">
            {{ t("captured") }}
        </div>
    </article>

    <!-- Speaker -->

    <article class="metric-card">
        <div class="metric-light metric-green"></div>

        <div class="metric-icon">◉</div>

        <div class="metric-copy">
            <span>
                {{ t("currentSpeaker") }}
            </span>

            <strong>
                {{ speakerName(currentSpeaker) }}
            </strong>
        </div>

        <div class="metric-trend">
            {{ t("selected") }}
        </div>
    </article>
</section>

<!-- =================================================
     CONTROLS
     ================================================= -->

<section class="command-bar">
    <div class="speaker-control">
        <span class="command-label">
            {{ t("activeSpeaker") }}
        </span>

        <button
            class="speaker-button"
            :class="{
                selected: currentSpeaker === 'A',
            }"
            @click="selectSpeaker('A')"
        >
            <span class="speaker-avatar speaker-a"> A </span>

            <span>
                {{ t("speakerA") }}
            </span>
        </button>

        <button
            class="speaker-button"
            :class="{
                selected: currentSpeaker === 'B',
            }"
            @click="selectSpeaker('B')"
        >
            <span class="speaker-avatar speaker-b"> B </span>

            <span>
                {{ t("speakerB") }}
            </span>
        </button>
    </div>

    <div class="voice-actions">
        <button class="listen-button" @click="startConversation">
            <span class="mic-symbol"> ● </span>

            {{ t("startListening") }}
        </button>

        <button class="stop-button" @click="stopConversation">
            <span> ■ </span>

            {{ t("stop") }}
        </button>
    </div>
</section>

<!-- =================================================
     WORKSPACE
     ================================================= -->

<section class="workspace">
    <!-- =============================================
         TRANSCRIPT
         ============================================= -->

    <article class="panel transcript-panel">
        <div class="panel-glow"></div>

        <div class="panel-header">
            <div>
                <span class="panel-kicker">
                    {{ t("realTimeTranscript") }}
                </span>

                <h2>
                    {{ t("liveConversation") }}
                </h2>
            </div>

            <div
                class="listening-state"
                :class="{
                    active: status === 'live',
                }"
            >
                <span></span>

                {{ t("aiListening") }}
            </div>
        </div>

        <div class="conversation-stage">
            <!-- 3D AI -->

            <div class="voice-visualizer">
                <div class="speaker-node">
                    <span class="speaker-avatar speaker-a">
                        A
                    </span>
                </div>

                <div class="connection-line line-left"></div>

                <div
                    class="ai-orb-wrap"
                    :class="{
                        listening: status === 'live',

                        warning: conflicts.length,

                        speaking: isAiSpeaking,
                    }"
                >
                    <div class="orb-ring ring-one"></div>
                    <div class="orb-ring ring-two"></div>
                    <div class="orb-ring ring-three"></div>

                    <div class="ai-orb">
                        <div class="orb-highlight"></div>

                        <div class="orb-core">✦</div>
                    </div>

                    <span class="orb-label">
                        {{ t("meaningLockAI") }}
                    </span>
                </div>

                <div class="connection-line line-right"></div>

                <div class="speaker-node">
                    <span class="speaker-avatar speaker-b">
                        B
                    </span>
                </div>
            </div>

            <!-- Empty -->

            <div
                v-if="!transcriptTurns.length && !partialTranscript"
                class="empty-state"
            >
                <h3>
                    {{ t("readyAnalyse") }}
                </h3>

                <p>
                    {{ t("readyAnalyseDescription") }}
                </p>
            </div>

            <!-- Transcript -->

            <div v-else class="conversation-list">
                <article
                    v-for="turn in transcriptTurns"
                    :key="turn.id"
                    class="conversation-turn"
                    :class="{
                        'turn-a': turn.speaker === 'A',

                        'turn-b': turn.speaker === 'B',
                    }"
                >
                    <div class="turn-header">
                        <div class="turn-person">
                            <span
                                class="speaker-avatar"
                                :class="
                                    turn.speaker === 'A'
                                        ? 'speaker-a'
                                        : 'speaker-b'
                                "
                            >
                                {{ turn.speaker }}
                            </span>

                            <div>
                                <strong>
                                    {{ speakerName(turn.speaker) }}
                                </strong>

                                <time>
                                    {{ turn.time }}
                                </time>
                            </div>
                        </div>
                    </div>

                    <p class="turn-text" dir="auto">
                        {{ turn.text }}
                    </p>
                </article>

                <!-- Partial -->

                <article
                    v-if="partialTranscript && !isAiSpeaking"
                    class="conversation-turn partial-turn"
                >
                    <div class="turn-header">
                        <div class="turn-person">
                            <span
                                class="speaker-avatar"
                                :class="
                                    currentSpeaker === 'A'
                                        ? 'speaker-a'
                                        : 'speaker-b'
                                "
                            >
                                {{ currentSpeaker }}
                            </span>

                            <strong>
                                {{ speakerName(currentSpeaker) }}
                            </strong>
                        </div>
                    </div>

                    <p class="turn-text partial-text" dir="auto">
                        <span class="partial-pulse"></span>

                        {{ partialTranscript }}
                    </p>
                </article>
            </div>
        </div>
    </article>

    <!-- =============================================
         AGREEMENT INTELLIGENCE
         ============================================= -->

    <article class="panel intelligence-panel">
        <div class="panel-glow"></div>

        <div class="panel-header">
            <div>
                <span class="panel-kicker">
                    {{ t("agreementIntelligence") }}
                </span>

                <h2>
                    {{ t("termsComparison") }}
                </h2>
            </div>

            <div class="risk-pill" :class="agreementStateClass">
                {{ agreementState }}
            </div>
        </div>

        <!-- Speaker A -->

        <div class="party-card party-a-card">
            <div class="party-header">
                <div class="party-user">
                    <span class="speaker-avatar speaker-a">
                        A
                    </span>

                    <div>
                        <strong>
                            {{ t("speakerA") }}
                        </strong>

                        <span>
                            {{ t("primaryParty") }}
                        </span>
                    </div>
                </div>

                <span
                    class="completion-dot"
                    :class="{
                        active: speakerAComplete,
                    }"
                ></span>
            </div>

            <div
                v-if="Object.keys(speakerA).length"
                class="terms-grid"
            >
                <div
                    v-for="field in fields"
                    :key="`a-${field}`"
                    class="term-card"
                    :class="{
                        missing: speakerA[field] === undefined,
                    }"
                >
                    <span>
                        {{ formatField(field) }}
                    </span>

                    <strong>
                        {{
                            speakerA[field] !== undefined
                                ? formatValue(
                                      field,
                                      speakerA[field],
                                  )
                                : "—"
                        }}
                    </strong>
                </div>
            </div>

            <div v-else class="party-placeholder">
                {{ t("waitingCommitments") }}
            </div>
        </div>

        <!-- Speaker B -->

        <div class="party-card party-b-card">
            <div class="party-header">
                <div class="party-user">
                    <span class="speaker-avatar speaker-b">
                        B
                    </span>

                    <div>
                        <strong>
                            {{ t("speakerB") }}
                        </strong>

                        <span>
                            {{ t("counterparty") }}
                        </span>
                    </div>
                </div>

                <span
                    class="completion-dot"
                    :class="{
                        active: speakerBComplete,
                    }"
                ></span>
            </div>

            <div
                v-if="Object.keys(speakerB).length"
                class="terms-grid"
            >
                <div
                    v-for="field in fields"
                    :key="`b-${field}`"
                    class="term-card"
                    :class="{
                        missing: speakerB[field] === undefined,
                    }"
                >
                    <span>
                        {{ formatField(field) }}
                    </span>

                    <strong>
                        {{
                            speakerB[field] !== undefined
                                ? formatValue(
                                      field,
                                      speakerB[field],
                                  )
                                : "—"
                        }}
                    </strong>
                </div>
            </div>

            <div v-else class="party-placeholder">
                {{ t("waitingCommitments") }}
            </div>
        </div>

        <!-- =========================================
             CONFLICT
             ========================================= -->

        <div v-if="conflicts.length" class="conflict-card">
            <div class="conflict-header">
                <div class="warning-symbol">!</div>

                <div>
                    <strong>
                        {{ conflicts.length }}

                        {{
                            conflicts.length === 1
                                ? t("conflictingTerm")
                                : t("conflictingTerms")
                        }}
                    </strong>

                    <span>
                        {{ t("clarificationRequired") }}
                    </span>
                </div>
            </div>

            <div
                v-for="conflict in conflicts"
                :key="conflict.field"
                class="conflict-row"
            >
                <span class="conflict-field">
                    {{ formatField(conflict.field) }}
                </span>

                <div class="conflict-values">
                    <!-- A -->

                    <div class="conflict-value value-a">
                        <small>
                            {{ t("speakerA") }}
                        </small>

                        <strong>
                            {{
                                formatValue(
                                    conflict.field,
                                    conflict.a,
                                )
                            }}
                        </strong>
                    </div>

                    <span class="not-equal"> ≠ </span>

                    <!-- B -->

                    <div class="conflict-value value-b">
                        <small>
                            {{ t("speakerB") }}
                        </small>

                        <strong>
                            {{
                                formatValue(
                                    conflict.field,
                                    conflict.b,
                                )
                            }}
                        </strong>
                    </div>
                </div>
            </div>

            <button
                class="clarify-button"
                @click="askForClarification(false)"
            >
                <span> ✦ </span>

                {{ t("askMeaningLock") }}
            </button>
        </div>

        <!-- =========================================
             MISSING TERMS
             ========================================= -->

        <div v-else-if="needsConfirmation" class="pending-card">
            <div class="pending-header">
                <div class="pending-symbol">?</div>

                <div>
                    <strong>
                        {{ t("missingConfirmationTitle") }}
                    </strong>

                    <span>
                        {{ t("missingConfirmationDescription") }}
                    </span>
                </div>
            </div>

            <div class="missing-list">
                <div
                    v-for="item in missingTerms"
                    :key="`${item.speaker}-${item.field}`"
                    class="missing-row"
                >
                    <span>
                        {{ formatField(item.field) }}
                    </span>

                    <strong>
                        {{ t("missingFrom") }}

                        {{ speakerName(item.speaker) }}
                    </strong>
                </div>
            </div>

            <button
                class="pending-action"
                @click="askForClarification(false)"
            >
                ✦
                {{ t("askMissingConfirmation") }}
            </button>
        </div>

        <!-- =========================================
             READY FOR CONFIRMATION
             ========================================= -->

        <div
            v-else-if="
                termsAlignedAndComplete && !verifiedAgreement
            "
            class="confirmation-card"
        >
            <div class="confirmation-head">
                <div class="verified-symbol">✓</div>

                <div>
                    <strong>
                        {{ t("readyForConfirmation") }}
                    </strong>

                    <span>
                        {{ t("readyForConfirmationDescription") }}
                    </span>
                </div>
            </div>

            <div class="confirmation-actions">
                <!-- A -->

                <button
                    :class="{
                        confirmed: confirmations.A,
                    }"
                    @click="confirmParty('A')"
                >
                    <span class="speaker-avatar speaker-a">
                        A
                    </span>

                    {{
                        confirmations.A
                            ? t("confirmed")
                            : t("confirmSpeakerA")
                    }}
                </button>

                <!-- B -->

                <button
                    :class="{
                        confirmed: confirmations.B,
                    }"
                    @click="confirmParty('B')"
                >
                    <span class="speaker-avatar speaker-b">
                        B
                    </span>

                    {{
                        confirmations.B
                            ? t("confirmed")
                            : t("confirmSpeakerB")
                    }}
                </button>
            </div>
        </div>

        <!-- =========================================
             VERIFIED AGREEMENT
             ========================================= -->

        <div v-if="verifiedAgreement" class="verified-agreement">
            <div class="verified-hero">
                <div class="verified-badge">✓</div>

                <div>
                    <strong>
                        {{ t("verifiedAgreement") }}
                    </strong>

                    <span>
                        {{ t("verifiedAgreementDescription") }}
                    </span>
                </div>
            </div>

            <div class="final-title">
                {{ t("finalTerms") }}
            </div>

            <div class="final-terms">
                <div
                    v-for="field in fields"
                    :key="`final-${field}`"
                    class="final-term"
                >
                    <span>
                        {{ formatField(field) }}
                    </span>

                    <strong>
                        {{ formatValue(field, speakerA[field]) }}
                    </strong>
                </div>
            </div>

            <div class="confirmed-by">
                <span>
                    {{ t("confirmedBy") }}
                </span>

                <div>
                    <span class="confirm-chip">
                        ✓ {{ t("speakerA") }}
                    </span>

                    <span class="confirm-chip">
                        ✓ {{ t("speakerB") }}
                    </span>
                </div>
            </div>

            <!-- =========================================
                 SAVE / SHARE / PDF
                 ========================================= -->

            <div class="agreement-save-section">
                <div
                    v-if="savingAgreement"
                    class="agreement-save-status"
                >
                    <span class="save-spinner"></span>

                    {{
                        isArabic
                            ? "جارٍ حفظ الاتفاق الموثق..."
                            : "Saving verified agreement..."
                    }}
                </div>

                <div
                    v-else-if="saveAgreementError"
                    class="agreement-save-error"
                >
                    <div>
                        <strong>
                            {{
                                isArabic
                                    ? "تعذر حفظ الاتفاق"
                                    : "Could not save agreement"
                            }}
                        </strong>

                        <span>
                            {{ saveAgreementError }}
                        </span>
                    </div>

                    <button
                        type="button"
                        @click="retrySaveAgreement"
                    >
                        {{
                            isArabic
                                ? "إعادة المحاولة"
                                : "Retry"
                        }}
                    </button>
                </div>

                <div
                    v-else-if="savedAgreement"
                    class="agreement-save-success"
                >
                    <div class="save-success-head">
                        <div class="save-success-icon">✓</div>

                        <div>
                            <strong>
                                {{
                                    isArabic
                                        ? "تم حفظ الاتفاق"
                                        : "Agreement saved"
                                }}
                            </strong>

                            <span
                                v-if="savedAgreement.public_id"
                            >
                                {{
                                    isArabic
                                        ? "معرّف الاتفاق:"
                                        : "Agreement ID:"
                                }}
                                {{ savedAgreement.public_id }}
                            </span>
                        </div>
                    </div>

                    <div class="agreement-save-actions">
                        <a
                            v-if="savedAgreement.share_url"
                            :href="savedAgreement.share_url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="agreement-action primary"
                        >
                            <span>↗</span>

                            {{
                                isArabic
                                    ? "عرض الاتفاق"
                                    : "View agreement"
                            }}
                        </a>

                        <a
                            v-if="savedAgreement.share_url"
                            :href="savedAgreement.share_url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="agreement-action"
                        >
                            <span>⇩</span>

                            {{
                                isArabic
                                    ? "طباعة / حفظ PDF"
                                    : "Print / Save PDF"
                            }}
                        </a>

                        <button
                            v-if="savedAgreement.share_url"
                            type="button"
                            class="agreement-action"
                            @click="copyShareLink"
                        >
                            <span>
                                {{ shareCopied ? "✓" : "⧉" }}
                            </span>

                            {{
                                shareCopied
                                    ? isArabic
                                        ? "تم نسخ الرابط"
                                        : "Link copied"
                                    : isArabic
                                      ? "نسخ رابط المشاركة"
                                      : "Copy share link"
                            }}
                        </button>
                    </div>
                </div>

                <div
                    v-else
                    class="agreement-save-status manual-save-status"
                >
                    <span>
                        {{
                            settings.autoSaveVerified
                                ? isArabic
                                    ? "تم التحقق من الاتفاق، وفي انتظار الحفظ..."
                                    : "Agreement verified and ready to save..."
                                : isArabic
                                  ? "الحفظ التلقائي متوقف. يمكنك حفظ الاتفاق يدويًا."
                                  : "Automatic saving is off. You can save this agreement manually."
                        }}
                    </span>

                    <button
                        v-if="!settings.autoSaveVerified"
                        type="button"
                        class="agreement-action primary"
                        @click="saveVerifiedAgreement"
                    >
                        {{ isArabic ? "حفظ الاتفاق" : "Save agreement" }}
                    </button>
                </div>
            </div>
        </div>

        <!-- MeaningLock message -->

        <div
            v-if="clarificationMessage"
            class="clarification-output"
        >
            <span class="ai-mini-icon"> ✦ </span>

            <p>
                {{ clarificationMessage }}
            </p>
        </div>
    </article>
</section>

<!-- =================================================
     TIMELINE
     ================================================= -->

<section class="timeline-panel">
    <div class="timeline-header">
        <div>
            <span class="panel-kicker">
                {{ t("agreementHistory") }}
            </span>

            <h2>
                {{ t("sessionTimeline") }}
            </h2>
        </div>

        <span class="timeline-count">
            {{ timeline.length }}

            {{ t("events") }}
        </span>
    </div>

    <div v-if="!timeline.length" class="timeline-empty">
        {{ t("timelineEmpty") }}
    </div>

    <div v-else class="timeline-list">
        <article
            v-for="item in timeline"
            :key="item.id"
            class="timeline-item"
        >
            <div
                class="timeline-marker"
                :class="{
                    ai: item.speaker === 'AI',
                }"
            >
                {{ item.speaker === "AI" ? "✦" : item.speaker }}
            </div>

            <div class="timeline-copy">
                <div class="timeline-top">
                    <strong>
                        {{
                            item.speaker === "AI"
                                ? t("meaningLock")
                                : speakerName(item.speaker)
                        }}
                    </strong>

                    <time>
                        {{ item.time }}
                    </time>
                </div>

                <!-- Conflict clarification -->

                <p v-if="item.type === 'clarification'">
                    {{ t("requestedClarification") }}

                    {{ item.value }}

                    {{
                        item.value === 1
                            ? t("conflictWord")
                            : t("conflictsWord")
                    }}.
                </p>

                <!-- Missing clarification -->

                <p v-else-if="item.type === 'missingClarification'">
                    {{ t("requestedClarification") }}

                    {{ item.value }}.
                </p>

                <!-- Confirmed -->

                <p v-else-if="item.type === 'confirmed'">
                    {{ t("confirmedEvent") }}.
                </p>

                <!-- Verified -->

                <p v-else-if="item.type === 'verified'">
                    {{ t("verifiedEvent") }}.
                </p>

                <!-- Saved -->

                <p v-else-if="item.type === 'saved'">
                    {{
                        isArabic
                            ? "تم حفظ الاتفاق الموثق وإنشاء رابط المشاركة."
                            : "The verified agreement was saved and a share link was created."
                    }}
                </p>

                <!-- Commitment -->

                <p v-else>
                    {{
                        item.type === "changed"
                            ? t("updated")
                            : t("added")
                    }}

                    {{ formatField(item.field) }}

                    {{ t("to") }}

                    <b>
                        {{
                            formatValue(item.field, item.value)
                        }} </b
                    >.
                </p>
            </div>
        </article>
    </div>
</section>
</template>
