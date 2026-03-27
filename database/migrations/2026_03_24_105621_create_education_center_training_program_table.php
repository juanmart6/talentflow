<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('education_center_training_program', function (Blueprint $table) {
            $table->id();
            $table->foreignId('education_center_id')
                ->constrained('education_centers')
                ->cascadeOnDelete();

            $table->foreignId('training_program_id')
                ->constrained('training_programs')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(['education_center_id', 'training_program_id'], 'ec_tp_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('education_center_training_program');
    }
};
