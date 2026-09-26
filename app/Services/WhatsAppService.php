<?php

namespace App\Services;

use App\Models\WhatsAppMessage;
use App\Models\WhatsAppSession;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class WhatsAppService
{
    public function configured(): bool
    {
        return filled(config('meaninglock_whatsapp.twilio.account_sid'))
            && filled(config('meaninglock_whatsapp.twilio.auth_token'))
            && filled(config('meaninglock_whatsapp.twilio.whatsapp_from'));
    }

    public function normalizeAddress(?string $value): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return '';
        }

        return str_starts_with($value, 'whatsapp:') ? $value : "whatsapp:{$value}";
    }

    public function phoneOnly(?string $value): string
    {
        return str_replace('whatsapp:', '', $this->normalizeAddress($value));
    }

    public function maskPhone(?string $value): ?string
    {
        $phone = $this->phoneOnly($value);

        if ($phone === '') {
            return null;
        }

        if (mb_strlen($phone) <= 8) {
            return $phone;
        }

        return mb_substr($phone, 0, 4).' **** '.mb_substr($phone, -4);
    }

    public function sendMessage(string $to, string $body, ?WhatsAppSession $session = null): array
    {
        if (! $this->configured()) {
            throw new RuntimeException('Twilio WhatsApp is not configured.');
        }

        $accountSid = config('meaninglock_whatsapp.twilio.account_sid');
        $authToken = config('meaninglock_whatsapp.twilio.auth_token');
        $from = $this->normalizeAddress(config('meaninglock_whatsapp.twilio.whatsapp_from'));
        $to = $this->normalizeAddress($to);

        $response = Http::withBasicAuth($accountSid, $authToken)
            ->asForm()
            ->timeout(30)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                'From' => $from,
                'To' => $to,
                'Body' => $body,
            ]);

        if ($response->failed()) {
            throw new RuntimeException(
                'Twilio send failed: '.($response->json('message') ?: $response->body())
            );
        }

        $data = $response->json();

        WhatsAppMessage::create([
            'session_id' => $session?->id,
            'twilio_sid' => $data['sid'] ?? null,
            'direction' => 'outbound',
            'from_phone' => $from,
            'to_phone' => $to,
            'type' => 'system',
            'body' => $body,
            'status' => $data['status'] ?? 'queued',
            'payload' => [
                'status' => $data['status'] ?? null,
            ],
        ]);

        return $data;
    }

    public function downloadMedia(string $url): array
    {
        $accountSid = config('meaninglock_whatsapp.twilio.account_sid');
        $authToken = config('meaninglock_whatsapp.twilio.auth_token');

        $response = Http::withBasicAuth($accountSid, $authToken)
            ->timeout(60)
            ->get($url);

        if ($response->failed()) {
            throw new RuntimeException('Could not download WhatsApp media from Twilio.');
        }

        return [
            'bytes' => $response->body(),
            'content_type' => $response->header('Content-Type') ?: 'application/octet-stream',
        ];
    }

    public function validWebhookSignature(Request $request): bool
    {
        if (! config('meaninglock_whatsapp.twilio.validate_signature')) {
            return true;
        }

        $signature = (string) $request->header('X-Twilio-Signature');
        $authToken = (string) config('meaninglock_whatsapp.twilio.auth_token');

        if ($signature === '' || $authToken === '') {
            return false;
        }

        $params = $request->post();
        ksort($params, SORT_STRING);

        $data = $request->fullUrl();

        foreach ($params as $key => $value) {
            if (is_array($value)) {
                foreach ($value as $nestedValue) {
                    $data .= $key.$nestedValue;
                }
            } else {
                $data .= $key.$value;
            }
        }

        $expected = base64_encode(hash_hmac('sha1', $data, $authToken, true));

        return hash_equals($expected, $signature);
    }

    public function emptyTwiml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    }
}
