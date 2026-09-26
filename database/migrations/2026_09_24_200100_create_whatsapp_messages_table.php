<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->nullable()->constrained('whatsapp_sessions')->nullOnDelete();
            $table->string('twilio_sid', 80)->nullable()->unique();
            $table->string('direction', 20)->default('inbound')->index();
            $table->string('speaker', 1)->nullable();
            $table->string('from_phone', 40)->nullable();
            $table->string('to_phone', 40)->nullable();
            $table->string('type', 20)->default('text')->index();
            $table->text('body')->nullable();
            $table->longText('transcript')->nullable();
            $table->text('media_url')->nullable();
            $table->string('media_content_type', 120)->nullable();
            $table->string('status', 30)->default('received')->index();
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_messages');
    }
};
