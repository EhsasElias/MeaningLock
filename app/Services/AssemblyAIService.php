<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class AssemblyAIService
{
    public function configured(): bool
    {
        return filled(config('meaninglock_whatsapp.assemblyai.api_key'));
    }

    public function transcribeBytes(string $bytes, string $contentType = 'application/octet-stream'): string
    {
        $apiKey = (string) config('meaninglock_whatsapp.assemblyai.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('ASSEMBLYAI_API_KEY is not configured.');
        }

        $upload = Http::withHeaders([
                'authorization' => $apiKey,
            ])
            ->withBody($bytes, $contentType)
            ->timeout(120)
            ->post('https://api.assemblyai.com/v2/upload');

        if ($upload->failed() || ! $upload->json('upload_url')) {
            throw new RuntimeException('AssemblyAI upload failed: '.$upload->body());
        }

        $submit = Http::withHeaders([
                'authorization' => $apiKey,
            ])
            ->acceptJson()
            ->timeout(60)
            ->post('https://api.assemblyai.com/v2/transcript', [
                'audio_url' => $upload->json('upload_url'),
                'speech_models' => ['universal-3-5-pro', 'universal-2'],
                'language_detection' => true,
            ]);

        if ($submit->failed() || ! $submit->json('id')) {
            throw new RuntimeException('AssemblyAI transcription request failed: '.$submit->body());
        }

        $transcriptId = $submit->json('id');
        $pollSeconds = max(1, (int) config('meaninglock_whatsapp.assemblyai.poll_seconds', 2));
        $maxPolls = max(5, (int) config('meaninglock_whatsapp.assemblyai.max_polls', 45));

        for ($attempt = 0; $attempt < $maxPolls; $attempt++) {
            sleep($pollSeconds);

            $result = Http::withHeaders([
                    'authorization' => $apiKey,
                ])
                ->acceptJson()
                ->timeout(30)
                ->get("https://api.assemblyai.com/v2/transcript/{$transcriptId}");

            if ($result->failed()) {
                continue;
            }

            $status = $result->json('status');

            if ($status === 'completed') {
                $text = trim((string) $result->json('text'));

                if ($text === '') {
                    throw new RuntimeException('AssemblyAI completed but returned an empty transcript.');
                }

                return $text;
            }

            if ($status === 'error') {
                throw new RuntimeException(
                    'AssemblyAI transcription failed: '.($result->json('error') ?: 'Unknown error')
                );
            }
        }

        throw new RuntimeException('AssemblyAI transcription timed out.');
    }
}
