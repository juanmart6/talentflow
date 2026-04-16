<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intern_hour_schedules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('intern_id')
                ->constrained('interns')
                ->cascadeOnDelete();
            $table->foreignId('created_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('season_name', 120)->nullable();
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('monday_minutes')->default(0);
            $table->unsignedInteger('tuesday_minutes')->default(0);
            $table->unsignedInteger('wednesday_minutes')->default(0);
            $table->unsignedInteger('thursday_minutes')->default(0);
            $table->unsignedInteger('friday_minutes')->default(0);
            $table->unsignedInteger('saturday_minutes')->default(0);
            $table->unsignedInteger('sunday_minutes')->default(0);
            $table->string('notes', 500)->nullable();
            $table->timestamps();

            $table->index(['intern_id', 'starts_on']);
            $table->index(['intern_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intern_hour_schedules');
    }
};
