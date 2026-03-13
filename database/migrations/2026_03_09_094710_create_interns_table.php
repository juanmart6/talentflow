<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('interns', function (Blueprint $table) {
            $table->id();

            $table->foreignId('education_center_id')->constrained()->cascadeOnDelete();


            $table->string('first_name');
            $table->string('last_name');
            $table->string('dni_nie', 20)->unique();
            $table->string('email')->unique();
            $table->string('phone', 50);
            $table->string('address_line');
            $table->string('postal_code', 20);
            $table->string('city');
            $table->string('province');
            $table->string('country', 100)->default('España');

            $table->string('training_cycle');
            $table->string('academic_year', 20);
            $table->string('academic_tutor_name');
            $table->string('academic_tutor_email')->nullable();

            $table->date('internship_start_date');
            $table->date('internship_end_date');
            $table->unsignedInteger('required_hours');

            $table->string('status', 20)->default('active');
            $table->string('abandonment_reason')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('academic_year');
            $table->index(['last_name', 'first_name']);
            $table->index(['education_center_id', 'status']);

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('interns');
    }
};
