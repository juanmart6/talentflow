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
        Schema::table('education_centers', function (Blueprint $table) {
            $table->text('general_notes')->nullable()->after('contact_email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('education_centers', function (Blueprint $table) {
            $table->dropColumn('general_notes');
        });
    }
};
