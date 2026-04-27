<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('education_centers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address', 500);
            $table->string('phone', 50);
            $table->string('institutional_email');
            $table->string('website')->nullable();

            $table->string('contact_name');
            $table->string('contact_position');
            $table->string('contact_phone', 50);
            $table->string('contact_email');

            $table->timestamps();

            $table->index('name');
            $table->index('institutional_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('education_centers');
    }
};
