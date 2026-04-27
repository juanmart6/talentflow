<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collaboration_agreements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('education_center_id')->constrained()->cascadeOnDelete();
            $table->date('signed_at');
            $table->date('expires_at');
            $table->unsignedInteger('agreed_slots');
            $table->string('pdf_path', 500);
            $table->timestamps();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collaboration_agreements');
    }
};
