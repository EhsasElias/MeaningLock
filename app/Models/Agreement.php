<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Agreement extends Model
{
    protected $fillable = [
        'public_id',
        'status',
        'price',
        'quantity',
        'delivery_date',
        'installation',
        'speaker_a_confirmed',
        'speaker_b_confirmed',
        'speaker_a_terms',
        'speaker_b_terms',
        'transcript',
        'timeline',
        'verified_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'quantity' => 'integer',
        'delivery_date' => 'date:Y-m-d',
        'speaker_a_confirmed' => 'boolean',
        'speaker_b_confirmed' => 'boolean',
        'speaker_a_terms' => 'array',
        'speaker_b_terms' => 'array',
        'transcript' => 'array',
        'timeline' => 'array',
        'verified_at' => 'datetime',
    ];
}
