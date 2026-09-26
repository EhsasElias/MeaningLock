<script setup>
import { inject } from "vue";

const {
    settings,
    fields,
    requiredFields,
    isArabic,
    locale,
    changeLanguage,
    formatField,
    resetSettings,
    clearSession,
} = inject("meaningLock");

function numberValue(event, fallback) {
    const value = Number(event.target.value);
    return Number.isFinite(value) ? value : fallback;
}
</script>

<template>
    <section class="settings-grid">
        <article class="settings-card settings-intro-card">
            <div class="settings-card-head">
                <div>
                    <span class="panel-kicker">{{ isArabic ? "عام" : "GENERAL" }}</span>
                    <h2>{{ isArabic ? "تجربة الاستخدام" : "Experience" }}</h2>
                </div>
                <div class="settings-icon">⚙</div>
            </div>

            <div class="setting-row">
                <div>
                    <strong>{{ isArabic ? "لغة الواجهة" : "Interface language" }}</strong>
                    <span>{{ isArabic ? "تغيير لغة لوحة التحكم فورًا." : "Change the dashboard language immediately." }}</span>
                </div>
                <div class="settings-segmented">
                    <button type="button" :class="{ active: locale === 'en' }" @click="changeLanguage('en')">EN</button>
                    <button type="button" :class="{ active: locale === 'ar' }" @click="changeLanguage('ar')">عربي</button>
                </div>
            </div>
        </article>

        <article class="settings-card">
            <div class="settings-card-head">
                <div>
                    <span class="panel-kicker">{{ isArabic ? "قواعد الاتفاق" : "AGREEMENT RULES" }}</span>
                    <h2>{{ isArabic ? "الشروط المطلوبة" : "Required terms" }}</h2>
                </div>
                <span class="settings-count">{{ requiredFields.length }}/{{ fields.length }}</span>
            </div>

            <p class="settings-help">
                {{ isArabic ? "لا يتم اعتبار الاتفاق مكتملًا حتى تتطابق الشروط المحددة لدى الطرفين." : "An agreement is complete only when the selected terms are present and aligned for both parties." }}
            </p>

            <div class="required-term-grid">
                <label v-for="field in fields" :key="field" class="required-term-card">
                    <div>
                        <strong>{{ formatField(field) }}</strong>
                        <span>{{ isArabic ? "مطلوب للتوثيق" : "Required for verification" }}</span>
                    </div>
                    <input v-model="settings.requiredTerms[field]" type="checkbox" />
                    <span class="settings-toggle"></span>
                </label>
            </div>

            <div class="setting-row compact">
                <div>
                    <strong>{{ isArabic ? "التوضيح التلقائي" : "Automatic clarification" }}</strong>
                    <span>{{ isArabic ? "دع MeaningLock يطلب التوضيح صوتيًا عند اكتشاف تعارض." : "Let MeaningLock automatically ask for clarification when a conflict is detected." }}</span>
                </div>
                <label class="switch-control">
                    <input v-model="settings.autoClarification" type="checkbox" />
                    <span></span>
                </label>
            </div>

            <div class="setting-row compact">
                <div>
                    <strong>{{ isArabic ? "حفظ الاتفاق تلقائيًا" : "Auto-save verified agreements" }}</strong>
                    <span>{{ isArabic ? "يحفظ الاتفاق فور تأكيد الطرفين." : "Save immediately after both parties confirm." }}</span>
                </div>
                <label class="switch-control">
                    <input v-model="settings.autoSaveVerified" type="checkbox" />
                    <span></span>
                </label>
            </div>
        </article>

        <article class="settings-card">
            <div class="settings-card-head">
                <div>
                    <span class="panel-kicker">{{ isArabic ? "الصوت" : "VOICE INTELLIGENCE" }}</span>
                    <h2>{{ isArabic ? "سلوك الذكاء الصوتي" : "Voice behavior" }}</h2>
                </div>
                <div class="settings-icon">✦</div>
            </div>

            <div class="setting-row compact">
                <div>
                    <strong>{{ isArabic ? "صوت MeaningLock" : "MeaningLock voice" }}</strong>
                    <span>{{ isArabic ? "تشغيل الرد الصوتي عند طلب التوضيح." : "Speak clarification prompts through the browser voice engine." }}</span>
                </div>
                <label class="switch-control">
                    <input v-model="settings.aiVoice" type="checkbox" />
                    <span></span>
                </label>
            </div>

            <div class="settings-field-row">
                <label>
                    <span>{{ isArabic ? "لغة الصوت" : "Voice language" }}</span>
                    <select v-model="settings.voiceLanguage">
                        <option value="auto">{{ isArabic ? "تلقائي" : "Auto" }}</option>
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                    </select>
                </label>

                <label>
                    <span>{{ isArabic ? "سرعة الكلام" : "Speech rate" }}</span>
                    <div class="range-row">
                        <input v-model.number="settings.speechRate" type="range" min="0.6" max="1.5" step="0.05" />
                        <strong>{{ Number(settings.speechRate).toFixed(2) }}</strong>
                    </div>
                </label>
            </div>

            <div class="setting-row compact">
                <div>
                    <strong>{{ isArabic ? "تنقية ضوضاء الميكروفون" : "Microphone noise filtering" }}</strong>
                    <span>{{ isArabic ? "تفعيل Echo cancellation وNoise suppression وAuto gain عند بدء جلسة جديدة." : "Enable echo cancellation, noise suppression and auto gain for new sessions." }}</span>
                </div>
                <label class="switch-control">
                    <input v-model="settings.noiseFiltering" type="checkbox" />
                    <span></span>
                </label>
            </div>
        </article>

        <article class="settings-card">
            <div class="settings-card-head">
                <div>
                    <span class="panel-kicker">{{ isArabic ? "النص المباشر" : "TRANSCRIPTION" }}</span>
                    <h2>{{ isArabic ? "فلترة العبارات" : "Turn filtering" }}</h2>
                </div>
                <div class="settings-icon">⌁</div>
            </div>

            <div class="setting-row compact">
                <div>
                    <strong>{{ isArabic ? "تجاهل العبارات القصيرة" : "Ignore short phrases" }}</strong>
                    <span>{{ isArabic ? "يمنع الضوضاء النصية القصيرة غير المرتبطة بشروط الاتفاق." : "Suppress short non-commitment recognition noise." }}</span>
                </div>
                <label class="switch-control">
                    <input v-model="settings.ignoreShortPhrases" type="checkbox" />
                    <span></span>
                </label>
            </div>

            <label class="number-setting" :class="{ disabled: !settings.ignoreShortPhrases }">
                <div>
                    <strong>{{ isArabic ? "الحد الأدنى للكلمات" : "Minimum words" }}</strong>
                    <span>{{ isArabic ? "العبارات التي تحتوي على شروط حقيقية تظل مقبولة حتى لو كانت أقصر." : "Real commitment phrases are still accepted even when shorter." }}</span>
                </div>
                <input
                    :disabled="!settings.ignoreShortPhrases"
                    :value="settings.minimumWords"
                    type="number"
                    min="1"
                    max="12"
                    @change="settings.minimumWords = Math.min(12, Math.max(1, numberValue($event, 4)))"
                />
            </label>
        </article>

        <article class="settings-card settings-danger-card">
            <div class="settings-card-head">
                <div>
                    <span class="panel-kicker">{{ isArabic ? "إدارة" : "MANAGEMENT" }}</span>
                    <h2>{{ isArabic ? "إعادة الضبط" : "Reset controls" }}</h2>
                </div>
            </div>

            <div class="settings-action-row">
                <div>
                    <strong>{{ isArabic ? "مسح الجلسة الحالية" : "Reset current session" }}</strong>
                    <span>{{ isArabic ? "يمسح النص والشروط والتأكيدات الحالية فقط، ولا يحذف الاتفاقات المحفوظة." : "Clears the current transcript, terms and confirmations. Saved agreements are not deleted." }}</span>
                </div>
                <button type="button" class="settings-secondary-button" @click="clearSession">
                    {{ isArabic ? "مسح الجلسة" : "Reset session" }}
                </button>
            </div>

            <div class="settings-action-row">
                <div>
                    <strong>{{ isArabic ? "إعادة الإعدادات الافتراضية" : "Restore default settings" }}</strong>
                    <span>{{ isArabic ? "يعيد إعدادات MeaningLock المحلية إلى القيم الافتراضية." : "Restore local MeaningLock preferences to their defaults." }}</span>
                </div>
                <button type="button" class="settings-danger-button" @click="resetSettings">
                    {{ isArabic ? "استعادة الافتراضي" : "Restore defaults" }}
                </button>
            </div>
        </article>
    </section>
</template>
