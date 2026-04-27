<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('practice_task_intern', function (Blueprint $table) {
            $table->foreignId('practice_task_id')
                ->constrained('practice_tasks')
                ->cascadeOnDelete();

            $table->foreignId('intern_id')
                ->constrained('interns')
                ->cascadeOnDelete();

            $table->timestamp('assigned_at')->nullable();

            $table->primary(['practice_task_id', 'intern_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('practice_task_intern');
    }
};
