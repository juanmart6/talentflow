<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('practice_tasks', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('status');
            $table->index(['status', 'sort_order']);
        });

        $statuses = ['pending', 'in_progress', 'in_review', 'completed'];

        foreach ($statuses as $status) {
            $taskIds = DB::table('practice_tasks')
                ->where('status', $status)
                ->orderByDesc('id')
                ->pluck('id');

            foreach ($taskIds as $index => $taskId) {
                DB::table('practice_tasks')
                    ->where('id', $taskId)
                    ->update(['sort_order' => $index + 1]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('practice_tasks', function (Blueprint $table) {
            $table->dropIndex(['status', 'sort_order']);
            $table->dropColumn('sort_order');
        });
    }
};
