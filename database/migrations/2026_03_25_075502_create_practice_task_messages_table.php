<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('practice_task_messages', function (Blueprint $table) {
            $table->id();

            $table->foreignId('practice_task_id')
                ->constrained('practice_tasks')
                ->cascadeOnDelete();

            $table->foreignId('author_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('author_role', 20); // tutor | intern
            $table->text('body');

            $table->timestamps();

            $table->index(['practice_task_id', 'created_at']);
            $table->index('author_role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('practice_task_messages');
    }
};