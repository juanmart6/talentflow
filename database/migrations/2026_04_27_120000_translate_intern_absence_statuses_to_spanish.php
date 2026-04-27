<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('intern_absence_requests')
            ->where('status', 'pending')
            ->update(['status' => 'pendiente']);

        DB::table('intern_absence_requests')
            ->where('status', 'approved')
            ->update(['status' => 'aprobada']);

        DB::table('intern_absence_requests')
            ->where('status', 'rejected')
            ->update(['status' => 'rechazada']);
    }

    public function down(): void
    {
        DB::table('intern_absence_requests')
            ->where('status', 'pendiente')
            ->update(['status' => 'pending']);

        DB::table('intern_absence_requests')
            ->where('status', 'aprobada')
            ->update(['status' => 'approved']);

        DB::table('intern_absence_requests')
            ->where('status', 'rechazada')
            ->update(['status' => 'rejected']);
    }
};
