<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('practice_tasks', function (Blueprint $table) {
            $table->dropIndex(['practice_type']);
            $table->dropColumn('practice_type');
        });
    }

    public function down(): void
    {
        Schema::table('practice_tasks', function (Blueprint $table) {
            $table->string('practice_type', 30)->default('development')->after('description');
            $table->index('practice_type');
        });
    }
};
