<?php

return [
    'public_url' => env('MEANINGLOCK_PUBLIC_URL', env('APP_URL')),

    'twilio' => [
        'account_sid' => env('TWILIO_ACCOUNT_SID'),
        'auth_token' => env('TWILIO_AUTH_TOKEN'),
        'whatsapp_from' => env('TWILIO_WHATSAPP_FROM'),
        'validate_signature' => env('TWILIO_VALIDATE_SIGNATURE', false),
    ],

    'assemblyai' => [
        'api_key' => env('ASSEMBLYAI_API_KEY'),
        'poll_seconds' => (int) env('ASSEMBLYAI_POLL_SECONDS', 2),
        'max_polls' => (int) env('ASSEMBLYAI_MAX_POLLS', 45),
    ],
];
