<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_clock_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('intern_id')
                ->constrained('interns')
                ->cascadeOnDelete();
            $table->foreignId('entered_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('source', 30)->default('self'); // self | tutor_manual
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->dateTime('break_started_at')->nullable();
            $table->unsignedInteger('break_minutes')->default(0);
            $table->string('manual_reason', 500)->nullable();
            $table->timestamps();

            $table->index(['intern_id', 'started_at']);
            $table->index(['intern_id', 'ended_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_clock_entries');
    }
};

