<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intern_practice_task', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('practice_task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('intern_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['practice_task_id', 'intern_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intern_practice_task');
    }
};
