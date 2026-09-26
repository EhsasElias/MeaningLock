<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessWhatsAppVoiceMessage;
use App\Models\WhatsAppMessage;
use App\Models\WhatsAppSession;
use App\Services\WhatsAppAgreementService;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class WhatsAppWebhookController extends Controller
{
    public function __construct(
        private readonly WhatsAppService $whatsapp,
        private readonly WhatsAppAgreementService $agreementEngine,
    ) {
    }

    public function handle(Request $request): Response
    {
        if (! $this->whatsapp->validWebhookSignature($request)) {
            abort(403, 'Invalid Twilio signature.');
        }

        $sid = trim((string) $request->input('MessageSid'));

        if ($sid !== '' && WhatsAppMessage::where('twilio_sid', $sid)->exists()) {
            return $this->twimlResponse();
        }

        $from = $this->whatsapp->normalizeAddress($request->input('From'));
        $to = $this->whatsapp->normalizeAddress($request->input('To'));
        $body = trim((string) $request->input('Body'));
        $numMedia = (int) $request->input('NumMedia', 0);
        $mediaUrl = $numMedia > 0 ? (string) $request->input('MediaUrl0') : null;
        $mediaContentType = $numMedia > 0 ? (string) $request->input('MediaContentType0') : null;

        try {
            if (preg_match('/^(START|ابدأ)$/iu', $body)) {
                $session = $this->agreementEngine->createSession($from);
                $this->recordInbound($request, $session, 'A', 'text', $body, null, null);

                $this->whatsapp->sendMessage(
                    $from,
                    "🔐 MeaningLock session created: {$session->code}\n\nYou are Speaker A. Share this code with Speaker B.\nSpeaker B should send:\nJOIN {$session->code}\n\nThen both parties can send agreement text or WhatsApp voice notes.",
                    $session,
                );

                return $this->twimlResponse();
            }

            if (preg_match('/^(?:JOIN|انضم)\s+(MLW-[A-Z0-9]{6})$/iu', $body, $match)) {
                $session = WhatsAppSession::where('code', strtoupper($match[1]))->first();

                if (! $session) {
                    $this->whatsapp->sendMessage($from, 'MeaningLock: session code not found. Check the code and try again.');
                    return $this->twimlResponse();
                }

                $session = $this->agreementEngine->joinSession($session, $from);
                $this->recordInbound($request, $session, 'B', 'text', $body, null, null);

                $this->whatsapp->sendMessage(
                    $session->party_b_phone,
                    "✅ Joined {$session->code}. You are Speaker B. Send your agreement terms as text or a voice note.",
                    $session,
                );

                $this->whatsapp->sendMessage(
                    $session->party_a_phone,
                    "✅ Speaker B joined {$session->code}. Both parties can now send their terms.",
                    $session,
                );

                return $this->twimlResponse();
            }

            if (preg_match('/^(?:CONFIRM|تأكيد)(?:\s+(MLW-[A-Z0-9]{6}))?$/iu', $body, $match)) {
                $session = ! empty($match[1])
                    ? WhatsAppSession::where('code', strtoupper($match[1]))->first()
                    : $this->agreementEngine->activeSessionForPhone($from);

                if (! $session || ! $session->speakerForPhone($from)) {
                    $this->whatsapp->sendMessage($from, 'MeaningLock: no active agreement session was found for this number.');
                    return $this->twimlResponse();
                }

                $speaker = $session->speakerForPhone($from);
                $this->recordInbound($request, $session, $speaker, 'text', $body, null, null);
                $this->agreementEngine->confirm($session, $speaker);

                return $this->twimlResponse();
            }

            $session = $this->agreementEngine->activeSessionForPhone($from);

            if (! $session) {
                $this->recordInbound($request, null, null, $numMedia > 0 ? 'media' : 'text', $body, $mediaUrl, $mediaContentType);

                $this->whatsapp->sendMessage(
                    $from,
                    "MeaningLock has no active session for this number.\n\nSend START to create a new agreement session, or JOIN MLW-XXXXXX to join one.",
                );

                return $this->twimlResponse();
            }

            $speaker = $session->speakerForPhone($from);

            if (! $speaker) {
                $this->whatsapp->sendMessage($from, 'MeaningLock: this phone number is not part of that session.', $session);
                return $this->twimlResponse();
            }

            if ($numMedia > 0) {
                $isAudio = str_starts_with(strtolower((string) $mediaContentType), 'audio/');

                if (! $isAudio) {
                    $this->recordInbound($request, $session, $speaker, 'media', $body, $mediaUrl, $mediaContentType);
                    $this->whatsapp->sendMessage(
                        $from,
                        'MeaningLock currently processes WhatsApp text and voice notes. Please send an audio voice note or text.',
                        $session,
                    );

                    return $this->twimlResponse();
                }

                $message = $this->recordInbound(
                    $request,
                    $session,
                    $speaker,
                    'audio',
                    $body,
                    $mediaUrl,
                    $mediaContentType,
                    'queued',
                );

                $this->whatsapp->sendMessage(
                    $from,
                    "🎤 Voice note received for {$session->code}. AssemblyAI is transcribing it now.",
                    $session,
                );

                ProcessWhatsAppVoiceMessage::dispatch($message->id);

                return $this->twimlResponse();
            }

            if ($body === '') {
                $this->whatsapp->sendMessage($from, 'MeaningLock: send agreement terms as text or a WhatsApp voice note.', $session);
                return $this->twimlResponse();
            }

            $message = $this->recordInbound($request, $session, $speaker, 'text', $body, null, null);
            $this->agreementEngine->ingestText($session, $speaker, $body, $message);
        } catch (Throwable $error) {
            report($error);

            try {
                if ($from !== '') {
                    $this->whatsapp->sendMessage(
                        $from,
                        '⚠️ MeaningLock could not process that message. Please try again.',
                    );
                }
            } catch (Throwable) {
                // Keep the webhook response successful even if the error reply cannot be sent.
            }
        }

        return $this->twimlResponse();
    }

    private function recordInbound(
        Request $request,
        ?WhatsAppSession $session,
        ?string $speaker,
        string $type,
        ?string $body,
        ?string $mediaUrl,
        ?string $mediaContentType,
        string $status = 'received',
    ): WhatsAppMessage {
        if ($session) {
            $session->update(['last_activity_at' => now()]);
        }

        return WhatsAppMessage::create([
            'session_id' => $session?->id,
            'twilio_sid' => $request->input('MessageSid'),
            'direction' => 'inbound',
            'speaker' => $speaker,
            'from_phone' => $this->whatsapp->normalizeAddress($request->input('From')),
            'to_phone' => $this->whatsapp->normalizeAddress($request->input('To')),
            'type' => $type,
            'body' => $body,
            'media_url' => $mediaUrl,
            'media_content_type' => $mediaContentType,
            'status' => $status,
            'payload' => [
                'num_media' => (int) $request->input('NumMedia', 0),
                'profile_name' => $request->input('ProfileName'),
                'wa_id' => $request->input('WaId'),
            ],
        ]);
    }

    private function twimlResponse(): Response
    {
        return response($this->whatsapp->emptyTwiml(), 200)
            ->header('Content-Type', 'text/xml');
    }
}
