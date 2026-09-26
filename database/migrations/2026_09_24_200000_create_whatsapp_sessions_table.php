<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('status', 40)->default('waiting_party_b')->index();
            $table->string('party_a_phone', 40)->nullable()->index();
            $table->string('party_b_phone', 40)->nullable()->index();
            $table->json('party_a_terms')->nullable();
            $table->json('party_b_terms')->nullable();
            $table->json('conflicts')->nullable();
            $table->boolean('party_a_confirmed')->default(false);
            $table->boolean('party_b_confirmed')->default(false);
            $table->foreignId('agreement_id')->nullable()->constrained('agreements')->nullOnDelete();
            $table->timestamp('last_activity_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_sessions');
    }
};
