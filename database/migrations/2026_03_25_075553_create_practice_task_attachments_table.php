<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('practice_task_attachments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('practice_task_id')
                ->constrained('practice_tasks')
                ->cascadeOnDelete();

            $table->foreignId('uploader_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('category', 30); // tutor_spec | intern_deliverable
            $table->string('original_name');
            $table->string('path');
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('size')->default(0);

            $table->timestamps();

            $table->index(['practice_task_id', 'category']);
            $table->index(['practice_task_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('practice_task_attachments');
    }
};