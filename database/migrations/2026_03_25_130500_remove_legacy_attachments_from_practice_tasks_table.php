<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('practice_tasks', 'attachments')) {
            Schema::table('practice_tasks', function (Blueprint $table) {
                $table->dropColumn('attachments');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('practice_tasks', 'attachments')) {
            Schema::table('practice_tasks', function (Blueprint $table) {
                $table->json('attachments')->nullable()->after('due_at');
            });
        }
    }
};
