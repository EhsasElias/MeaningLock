<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\View\View;

class AgreementController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Agreement::query()
                ->latest('verified_at')
                ->latest('id')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->filled('delivery_date')) {
            try {
                $request->merge([
                    'delivery_date' => Carbon::parse(
                        (string) $request->input('delivery_date')
                    )->toDateString(),
                ]);
            } catch (\Throwable) {
                // Validation below returns the proper error for an invalid date.
            }
        }

        $data = $request->validate([
            'price' => ['nullable', 'numeric', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:0'],
            'delivery_date' => ['nullable', 'date_format:Y-m-d'],
            'installation' => ['nullable', 'string', 'in:Included,Excluded'],
            'speaker_a_confirmed' => ['required', 'boolean'],
            'speaker_b_confirmed' => ['required', 'boolean'],
            'speaker_a_terms' => ['nullable', 'array'],
            'speaker_b_terms' => ['nullable', 'array'],
            'transcript' => ['nullable', 'array'],
            'timeline' => ['nullable', 'array'],
        ]);

        $agreement = Agreement::create([
            'public_id' => (string) Str::uuid(),
            'status' => 'verified',
            'price' => $data['price'] ?? null,
            'quantity' => $data['quantity'] ?? null,
            'delivery_date' => $data['delivery_date'] ?? null,
            'installation' => $data['installation'] ?? null,
            'speaker_a_confirmed' => $data['speaker_a_confirmed'],
            'speaker_b_confirmed' => $data['speaker_b_confirmed'],
            'speaker_a_terms' => $data['speaker_a_terms'] ?? [],
            'speaker_b_terms' => $data['speaker_b_terms'] ?? [],
            'transcript' => $data['transcript'] ?? [],
            'timeline' => $data['timeline'] ?? [],
            'verified_at' => now(),
        ]);

        return response()->json([
            'message' => 'Agreement saved.',
            'agreement' => $agreement->fresh(),
            'share_url' => route('agreements.public', $agreement->public_id),
        ], 201);
    }

    public function show(Agreement $agreement): JsonResponse
    {
        return response()->json($agreement);
    }

    public function publicShow(string $publicId): View
    {
        $agreement = Agreement::query()
            ->where('public_id', $publicId)
            ->firstOrFail();

        return view('agreements.public', compact('agreement'));
    }
}
