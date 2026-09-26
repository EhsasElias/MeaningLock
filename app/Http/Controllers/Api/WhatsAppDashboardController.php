<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppMessage;
use App\Models\WhatsAppSession;
use App\Services\AssemblyAIService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class WhatsAppDashboardController extends Controller
{
    public function __construct(
        private readonly WhatsAppService $whatsapp,
        private readonly AssemblyAIService $assemblyAI,
    ) {
    }

    public function index(): JsonResponse
    {
        $sessions = WhatsAppSession::query()
            ->with('agreement:id,public_id,status')
            ->latest('last_activity_at')
            ->latest('id')
            ->limit(20)
            ->get();

        $messages = WhatsAppMessage::query()
            ->with('session:id,code')
            ->latest('id')
            ->limit(20)
            ->get();

        return response()->json([
            'connection' => [
                'twilio_configured' => $this->whatsapp->configured(),
                'assemblyai_configured' => $this->assemblyAI->configured(),
                'webhook_url' => rtrim((string) config('meaninglock_whatsapp.public_url'), '/').'/api/webhooks/whatsapp',
            ],
            'stats' => [
                'sessions' => WhatsAppSession::count(),
                'active_sessions' => WhatsAppSession::whereNotIn('status', ['verified', 'cancelled'])->count(),
                'messages' => WhatsAppMessage::where('direction', 'inbound')->count(),
                'voice_notes' => WhatsAppMessage::where('direction', 'inbound')->where('type', 'audio')->count(),
                'conflict_sessions' => WhatsAppSession::where('status', 'clarification_required')->count(),
                'verified_sessions' => WhatsAppSession::where('status', 'verified')->count(),
            ],
            'sessions' => $sessions->map(function (WhatsAppSession $session) {
                return [
                    'id' => $session->id,
                    'code' => $session->code,
                    'status' => $session->status,
                    'party_a_phone' => $this->whatsapp->maskPhone($session->party_a_phone),
                    'party_b_phone' => $this->whatsapp->maskPhone($session->party_b_phone),
                    'party_a_terms' => $session->party_a_terms ?? [],
                    'party_b_terms' => $session->party_b_terms ?? [],
                    'conflicts' => $session->conflicts ?? [],
                    'party_a_confirmed' => $session->party_a_confirmed,
                    'party_b_confirmed' => $session->party_b_confirmed,
                    'agreement_public_id' => $session->agreement?->public_id,
                    'last_activity_at' => optional($session->last_activity_at)->toIso8601String(),
                ];
            })->values(),
            'messages' => $messages->map(function (WhatsAppMessage $message) {
                $preview = trim((string) ($message->transcript ?: $message->body));

                return [
                    'id' => $message->id,
                    'session_code' => $message->session?->code,
                    'direction' => $message->direction,
                    'speaker' => $message->speaker,
                    'type' => $message->type,
                    'status' => $message->status,
                    'preview' => Str::limit($preview, 180),
                    'created_at' => optional($message->created_at)->toIso8601String(),
                ];
            })->values(),
        ]);
    }
}
