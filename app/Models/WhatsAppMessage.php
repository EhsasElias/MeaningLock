<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppMessage extends Model
{
    protected $table = 'whatsapp_messages';

    protected $fillable = [
        'session_id',
        'twilio_sid',
        'direction',
        'speaker',
        'from_phone',
        'to_phone',
        'type',
        'body',
        'transcript',
        'media_url',
        'media_content_type',
        'status',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(
            WhatsAppSession::class,
            'session_id'
        );
    }
}
