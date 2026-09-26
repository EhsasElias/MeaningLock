<?php

namespace App\Jobs;

use App\Models\WhatsAppMessage;
use App\Services\AssemblyAIService;
use App\Services\WhatsAppAgreementService;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class ProcessWhatsAppVoiceMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 180;

    public function __construct(public readonly int $messageId)
    {
    }

    public function handle(
        WhatsAppService $whatsapp,
        AssemblyAIService $assemblyAI,
        WhatsAppAgreementService $agreementEngine,
    ): void {
        $message = WhatsAppMessage::with('session')->findOrFail($this->messageId);
        $session = $message->session;

        if (! $session || ! $message->media_url || ! $message->speaker) {
            $message->update(['status' => 'failed']);
            return;
        }

        try {
            $message->update(['status' => 'transcribing']);

            $media = $whatsapp->downloadMedia($message->media_url);
            $transcript = $assemblyAI->transcribeBytes(
                $media['bytes'],
                $message->media_content_type ?: $media['content_type'],
            );

            $message->update([
                'transcript' => $transcript,
                'status' => 'transcribed',
            ]);

            $whatsapp->sendMessage(
                $message->from_phone,
                "🎤 MeaningLock transcript for {$session->code}:\n\n{$transcript}",
                $session,
            );

            $agreementEngine->ingestText(
                $session->fresh(),
                $message->speaker,
                $transcript,
                $message->fresh(),
            );
        } catch (Throwable $error) {
            report($error);

            $message->update([
                'status' => 'failed',
                'payload' => array_merge($message->payload ?? [], [
                    'processing_error' => $error->getMessage(),
                ]),
            ]);

            $whatsapp->sendMessage(
                $message->from_phone,
                "⚠️ MeaningLock could not process that voice note. Please try again or send the agreement terms as text.",
                $session,
            );

            return;
        }
    }
}
