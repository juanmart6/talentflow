<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intern_absence_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('intern_id')
                ->constrained('interns')
                ->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('reviewed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('reason', 500);
            $table->string('attachment_path')->nullable();
            $table->string('status', 30)->default('pendiente'); // pendiente | aprobada | rechazada
            $table->dateTime('reviewed_at')->nullable();
            $table->string('review_note', 500)->nullable();
            $table->timestamps();

            $table->index(['intern_id', 'status']);
            $table->index(['intern_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intern_absence_requests');
    }
};
