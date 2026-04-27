<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('practice_tasks', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            $table->text('description')->nullable();

            // development | test | live_activity
            $table->string('practice_type', 30);
            // pending | in_progress | in_review | completed
            $table->string('status', 30)->default('pending');

            $table->date('due_at')->nullable();

            $table->foreignId('created_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('practice_type');
            $table->index('due_at');
            $table->index(['status', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('practice_tasks');
    }
};
