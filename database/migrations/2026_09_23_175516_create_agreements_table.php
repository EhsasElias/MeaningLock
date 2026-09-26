<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agreements', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('status', 30)->default('verified')->index();
            $table->decimal('price', 15, 2)->nullable();
            $table->unsignedInteger('quantity')->nullable();
            $table->date('delivery_date')->nullable();
            $table->string('installation', 30)->nullable();
            $table->boolean('speaker_a_confirmed')->default(false);
            $table->boolean('speaker_b_confirmed')->default(false);
            $table->json('speaker_a_terms')->nullable();
            $table->json('speaker_b_terms')->nullable();
            $table->json('transcript')->nullable();
            $table->json('timeline')->nullable();
            $table->timestamp('verified_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agreements');
    }
};
