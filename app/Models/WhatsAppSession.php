<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppSession extends Model
{
    protected $table = 'whatsapp_sessions';

    protected $fillable = [
        'code',
        'status',
        'party_a_phone',
        'party_b_phone',
        'party_a_terms',
        'party_b_terms',
        'conflicts',
        'party_a_confirmed',
        'party_b_confirmed',
        'agreement_id',
        'last_activity_at',
    ];

    protected $casts = [
        'party_a_terms' => 'array',
        'party_b_terms' => 'array',
        'conflicts' => 'array',
        'party_a_confirmed' => 'boolean',
        'party_b_confirmed' => 'boolean',
        'last_activity_at' => 'datetime',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsAppMessage::class, 'session_id');
    }

    public function agreement(): BelongsTo
    {
        return $this->belongsTo(Agreement::class);
    }

    public function speakerForPhone(string $phone): ?string
    {
        if ($this->party_a_phone === $phone) {
            return 'A';
        }

        if ($this->party_b_phone === $phone) {
            return 'B';
        }

        return null;
    }
}
