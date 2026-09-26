<?php

use App\Http\Controllers\AgreementController;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/assemblyai/token', function () {
    $apiKey = (string) env('ASSEMBLYAI_API_KEY');

    if ($apiKey === '') {
        return response()->json([
            'message' => 'ASSEMBLYAI_API_KEY is not configured.',
        ], 500);
    }

    $response = Http::withHeaders([
        'Authorization' => $apiKey,
    ])->get('https://streaming.assemblyai.com/v3/token', [
        'expires_in_seconds' => 300,
    ]);

    if ($response->failed()) {
        return response()->json([
            'message' => 'AssemblyAI token error',
            'error' => $response->json(),
        ], $response->status());
    }

    return response()->json($response->json());
});

Route::get('/agreement/{publicId}', [AgreementController::class, 'publicShow'])
    ->name('agreements.public');
