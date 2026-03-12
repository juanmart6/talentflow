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
        Schema::table('interns', function (Blueprint $table) {
            $table->string('collaboration_agreement_path')->nullable()->after('abandonment_reason');
            $table->string('insurance_policy_path')->nullable()->after('collaboration_agreement_path');
            $table->string('dni_scan_path')->nullable()->after('insurance_policy_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('interns', function (Blueprint $table) {
            $table->dropColumn([
                'collaboration_agreement_path',
                'insurance_policy_path',
                'dni_scan_path',    
            ]);
        });
    }
};
