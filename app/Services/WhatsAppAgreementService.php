<?php

namespace App\Services;

use App\Models\Agreement;
use App\Models\WhatsAppMessage;
use App\Models\WhatsAppSession;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use RuntimeException;

class WhatsAppAgreementService
{
    private const FIELDS = ['price', 'quantity', 'date', 'installation'];

    public function __construct(private readonly WhatsAppService $whatsapp)
    {
    }

    public function createSession(string $partyAPhone): WhatsAppSession
    {
        do {
            $code = 'MLW-'.Str::upper(Str::random(6));
        } while (WhatsAppSession::where('code', $code)->exists());

        return WhatsAppSession::create([
            'code' => $code,
            'status' => 'waiting_party_b',
            'party_a_phone' => $this->whatsapp->normalizeAddress($partyAPhone),
            'party_a_terms' => [],
            'party_b_terms' => [],
            'conflicts' => [],
            'last_activity_at' => now(),
        ]);
    }

    public function joinSession(WhatsAppSession $session, string $partyBPhone): WhatsAppSession
    {
        $partyBPhone = $this->whatsapp->normalizeAddress($partyBPhone);

        if ($session->party_a_phone === $partyBPhone) {
            throw new RuntimeException('Party B must use a different WhatsApp number.');
        }

        if ($session->party_b_phone && $session->party_b_phone !== $partyBPhone) {
            throw new RuntimeException('This session already has Party B.');
        }

        $session->update([
            'party_b_phone' => $partyBPhone,
            'status' => 'active',
            'last_activity_at' => now(),
        ]);

        return $session->fresh();
    }

    public function activeSessionForPhone(string $phone): ?WhatsAppSession
    {
        $phone = $this->whatsapp->normalizeAddress($phone);

        return WhatsAppSession::query()
            ->where(function ($query) use ($phone) {
                $query->where('party_a_phone', $phone)
                    ->orWhere('party_b_phone', $phone);
            })
            ->whereNotIn('status', ['verified', 'cancelled'])
            ->latest('last_activity_at')
            ->latest('id')
            ->first();
    }

    public function ingestText(
        WhatsAppSession $session,
        string $speaker,
        string $text,
        ?WhatsAppMessage $message = null,
    ): array {
        $text = trim($text);
        $extracted = $this->extractTerms($text);

        if (! in_array($speaker, ['A', 'B'], true)) {
            throw new RuntimeException('Unknown WhatsApp agreement speaker.');
        }

        $previousStatus = $session->status;
        $previousConflicts = $session->conflicts ?? [];
        $termsField = $speaker === 'A' ? 'party_a_terms' : 'party_b_terms';
        $currentTerms = $session->{$termsField} ?? [];
        $mergedTerms = array_merge($currentTerms, $extracted);
        $changed = $mergedTerms !== $currentTerms;

        $updates = [
            $termsField => $mergedTerms,
            'last_activity_at' => now(),
        ];

        if ($changed) {
            $updates['party_a_confirmed'] = false;
            $updates['party_b_confirmed'] = false;
        }

        $session->update($updates);
        $session->refresh();

        $conflicts = $this->detectConflicts(
            $session->party_a_terms ?? [],
            $session->party_b_terms ?? [],
        );

        $complete = $this->complete($session->party_a_terms ?? [])
            && $this->complete($session->party_b_terms ?? []);

        if ($conflicts) {
            $status = 'clarification_required';
        } elseif ($complete) {
            $status = 'aligned';
        } else {
            $status = $session->party_b_phone ? 'active' : 'waiting_party_b';
        }

        $session->update([
            'status' => $status,
            'conflicts' => $conflicts,
            'last_activity_at' => now(),
        ]);

        if ($message) {
            $message->update([
                'status' => 'processed',
                'transcript' => $message->transcript ?: $text,
            ]);
        }

        $session->refresh();

        $conflictsChanged = json_encode($previousConflicts) !== json_encode($conflicts);
        $becameAligned = $status === 'aligned' && $previousStatus !== 'aligned';

        $this->notifyAfterTerms(
            $session,
            $speaker,
            $extracted,
            $conflictsChanged,
            $becameAligned,
        );

        return [
            'session' => $session,
            'extracted' => $extracted,
            'conflicts' => $conflicts,
            'complete' => $complete,
            'status' => $status,
        ];
    }

    public function confirm(WhatsAppSession $session, string $speaker): ?Agreement
    {
        if (! in_array($speaker, ['A', 'B'], true)) {
            throw new RuntimeException('Unknown WhatsApp agreement speaker.');
        }

        if ($session->status === 'verified' && $session->agreement) {
            return $session->agreement;
        }

        if ($session->status !== 'aligned') {
            $this->whatsapp->sendMessage(
                $speaker === 'A' ? $session->party_a_phone : $session->party_b_phone,
                "⚠️ {$session->code} cannot be confirmed yet. The terms must be complete and aligned first.",
                $session,
            );

            return null;
        }

        $field = $speaker === 'A' ? 'party_a_confirmed' : 'party_b_confirmed';

        $session->update([
            $field => true,
            'last_activity_at' => now(),
        ]);

        $session->refresh();

        if (! $session->party_a_confirmed || ! $session->party_b_confirmed) {
            $otherPhone = $speaker === 'A' ? $session->party_b_phone : $session->party_a_phone;
            $currentPhone = $speaker === 'A' ? $session->party_a_phone : $session->party_b_phone;

            $this->whatsapp->sendMessage(
                $currentPhone,
                "✅ Speaker {$speaker} confirmed {$session->code}. Waiting for the other party.",
                $session,
            );

            if ($otherPhone) {
                $this->whatsapp->sendMessage(
                    $otherPhone,
                    "MeaningLock: Speaker {$speaker} confirmed {$session->code}. Reply CONFIRM {$session->code} when you agree with the final terms.",
                    $session,
                );
            }

            return null;
        }

        $agreement = $this->createVerifiedAgreement($session);

        $session->update([
            'status' => 'verified',
            'agreement_id' => $agreement->id,
            'last_activity_at' => now(),
        ]);

        $reference = 'ML-'.str_pad((string) $agreement->id, 6, '0', STR_PAD_LEFT);
        $url = rtrim((string) config('meaninglock_whatsapp.public_url'), '/').'/agreement/'.$agreement->public_id;
        $message = "✅ Verified Agreement\n{$reference}\n\n".$this->formatFinalTerms($session)."\n\nView verified agreement:\n{$url}";

        foreach (array_filter([$session->party_a_phone, $session->party_b_phone]) as $phone) {
            $this->whatsapp->sendMessage($phone, $message, $session);
        }

        return $agreement;
    }

    public function extractTerms(string $originalText): array
    {
        $text = $this->normalizeArabicNumbers($originalText);
        $terms = [];

        $pricePatterns = [
            '/(?:for|price(?:\s+is)?|cost(?:s)?|total(?:\s+is)?)\s*[:=-]?\s*\$?([\d,]+(?:\.\d+)?)/iu',
            '/\$\s*([\d,]+(?:\.\d+)?)/u',
            '/([\d,]+(?:\.\d+)?)\s*(?:usd|dollars?|sar|riyal|riyals)\b/iu',
            '/(?:السعر|بسعر|التكلفة|الإجمالي)\s*[:=-]?\s*([\d,]+(?:\.\d+)?)/u',
            '/([\d,]+(?:\.\d+)?)\s*(?:دولار|ريال|ر\.س)/u',
        ];

        foreach ($pricePatterns as $pattern) {
            if (preg_match($pattern, $text, $match)) {
                $terms['price'] = (float) str_replace(',', '', $match[1]);
                break;
            }
        }

        if (preg_match('/\b([\d,]+)\s*(?:units?|items?|pieces?|pcs?)\b/iu', $text, $match)
            || preg_match('/\b([\d,]+)\s*(?:وحدة|وحدات|قطعة|قطع)\b/u', $text, $match)) {
            $terms['quantity'] = (int) str_replace(',', '', $match[1]);
        }

        $englishDatePattern = '/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/iu';

        if (preg_match($englishDatePattern, $text, $match)) {
            $clean = preg_replace('/(\d+)(st|nd|rd|th)/iu', '$1', $match[0]);

            try {
                $terms['date'] = Carbon::parse($clean)->format('Y-m-d');
            } catch (\Throwable) {
                // Keep processing other agreement fields.
            }
        } elseif (preg_match('/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/u', $text, $match)) {
            $day = (int) $match[1];
            $month = (int) $match[2];
            $year = isset($match[3]) && $match[3] !== '' ? (int) $match[3] : now()->year;
            $year = $year < 100 ? 2000 + $year : $year;

            if (checkdate($month, $day, $year)) {
                $terms['date'] = Carbon::create($year, $month, $day)->format('Y-m-d');
            }
        }

        $excludedPatterns = [
            '/installation\s+(?:is\s+)?not\s+included/iu',
            '/installation\s+isn[\'’]?t\s+included/iu',
            '/without\s+installation/iu',
            '/does\s+not\s+include\s+installation/iu',
            '/installation\s+excluded/iu',
            '/التركيب\s+غير\s+مشمول/u',
            '/لا\s+يشمل\s+التركيب/u',
            '/بدون\s+تركيب/u',
        ];

        $includedPatterns = [
            '/installation\s+(?:is\s+)?included/iu',
            '/includes?\s+installation/iu',
            '/with\s+installation/iu',
            '/التركيب\s+مشمول/u',
            '/يشمل\s+التركيب/u',
        ];

        foreach ($excludedPatterns as $pattern) {
            if (preg_match($pattern, $text)) {
                $terms['installation'] = 'Excluded';
                break;
            }
        }

        if (! isset($terms['installation'])) {
            foreach ($includedPatterns as $pattern) {
                if (preg_match($pattern, $text)) {
                    $terms['installation'] = 'Included';
                    break;
                }
            }
        }

        return $terms;
    }

    public function detectConflicts(array $a, array $b): array
    {
        $conflicts = [];

        foreach (self::FIELDS as $field) {
            if (! array_key_exists($field, $a) || ! array_key_exists($field, $b)) {
                continue;
            }

            if ($this->normalizeComparable($field, $a[$field]) !== $this->normalizeComparable($field, $b[$field])) {
                $conflicts[] = [
                    'field' => $field,
                    'a' => $a[$field],
                    'b' => $b[$field],
                ];
            }
        }

        return $conflicts;
    }

    private function complete(array $terms): bool
    {
        foreach (self::FIELDS as $field) {
            if (! array_key_exists($field, $terms) || $terms[$field] === null || $terms[$field] === '') {
                return false;
            }
        }

        return true;
    }

    private function normalizeComparable(string $field, mixed $value): string
    {
        if (in_array($field, ['price', 'quantity'], true)) {
            return (string) ((float) $value);
        }

        return Str::lower(trim((string) $value));
    }

    private function notifyAfterTerms(
        WhatsAppSession $session,
        string $speaker,
        array $extracted,
        bool $conflictsChanged,
        bool $becameAligned,
    ): void {
        $speakerPhone = $speaker === 'A' ? $session->party_a_phone : $session->party_b_phone;

        if (! $extracted) {
            $this->whatsapp->sendMessage(
                $speakerPhone,
                "MeaningLock did not detect agreement terms in that message. Mention price, quantity, delivery date, or installation.",
                $session,
            );

            return;
        }

        if ($session->conflicts && $conflictsChanged) {
            $message = "⚠️ MeaningLock detected differences in {$session->code}:\n\n"
                .$this->formatConflicts($session->conflicts)
                ."\n\nPlease clarify before confirming.";

            foreach (array_filter([$session->party_a_phone, $session->party_b_phone]) as $phone) {
                $this->whatsapp->sendMessage($phone, $message, $session);
            }

            return;
        }

        if ($becameAligned) {
            $message = "✅ Terms are aligned for {$session->code}.\n\n"
                .$this->formatFinalTerms($session)
                ."\n\nIf you agree, reply:\nCONFIRM {$session->code}";

            foreach (array_filter([$session->party_a_phone, $session->party_b_phone]) as $phone) {
                $this->whatsapp->sendMessage($phone, $message, $session);
            }

            return;
        }

        $captured = collect($extracted)
            ->map(fn ($value, $field) => '• '.$this->fieldLabel($field).': '.$this->formatValue($field, $value))
            ->implode("\n");

        $this->whatsapp->sendMessage(
            $speakerPhone,
            "✓ MeaningLock captured Speaker {$speaker} terms for {$session->code}:\n{$captured}",
            $session,
        );
    }

    private function createVerifiedAgreement(WhatsAppSession $session): Agreement
    {
        $terms = $session->party_a_terms ?? [];
        $messages = $session->messages()->where('direction', 'inbound')->oldest()->get();

        $transcript = $messages->map(function (WhatsAppMessage $message) {
            return [
                'speaker' => $message->speaker,
                'text' => $message->transcript ?: $message->body,
                'time' => optional($message->created_at)->format('H:i'),
                'source' => 'whatsapp',
                'type' => $message->type,
            ];
        })->values()->all();

        $timeline = [
            [
                'id' => (string) Str::uuid(),
                'speaker' => 'AI',
                'type' => 'verified',
                'time' => now()->format('H:i'),
                'timestamp' => now()->toIso8601String(),
                'source' => 'whatsapp',
            ],
        ];

        return Agreement::create([
            'public_id' => (string) Str::uuid(),
            'status' => 'verified',
            'price' => Arr::get($terms, 'price'),
            'quantity' => Arr::get($terms, 'quantity'),
            'delivery_date' => Arr::get($terms, 'date'),
            'installation' => Arr::get($terms, 'installation'),
            'speaker_a_confirmed' => true,
            'speaker_b_confirmed' => true,
            'speaker_a_terms' => $session->party_a_terms ?? [],
            'speaker_b_terms' => $session->party_b_terms ?? [],
            'transcript' => $transcript,
            'timeline' => $timeline,
            'verified_at' => now(),
        ]);
    }

    private function formatConflicts(array $conflicts): string
    {
        return collect($conflicts)->map(function (array $conflict) {
            $field = $this->fieldLabel($conflict['field']);
            $a = $this->formatValue($conflict['field'], $conflict['a']);
            $b = $this->formatValue($conflict['field'], $conflict['b']);

            return "• {$field}: A {$a} ≠ B {$b}";
        })->implode("\n");
    }

    private function formatFinalTerms(WhatsAppSession $session): string
    {
        $terms = $session->party_a_terms ?? [];

        return collect(self::FIELDS)
            ->map(fn (string $field) => '• '.$this->fieldLabel($field).': '.$this->formatValue($field, $terms[$field] ?? null))
            ->implode("\n");
    }

    private function fieldLabel(string $field): string
    {
        return match ($field) {
            'price' => 'Price',
            'quantity' => 'Quantity',
            'date' => 'Delivery',
            'installation' => 'Installation',
            default => Str::headline($field),
        };
    }

    private function formatValue(string $field, mixed $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return match ($field) {
            'price' => '$'.number_format((float) $value, 2),
            'quantity' => number_format((int) $value).' units',
            'date' => Carbon::parse($value)->format('M j, Y'),
            default => (string) $value,
        };
    }

    private function normalizeArabicNumbers(string $value): string
    {
        return strtr($value, [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
            '٬' => ',', '٫' => '.',
        ]);
    }
}
