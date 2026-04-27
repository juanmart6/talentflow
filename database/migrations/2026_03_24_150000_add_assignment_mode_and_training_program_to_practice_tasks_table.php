<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('practice_tasks', function (Blueprint $table) {
            $table->string('assignment_mode', 30)
                ->default('interns')
                ->after('status');

            $table->foreignId('training_program_id')
                ->nullable()
                ->after('assignment_mode')
                ->constrained('training_programs')
                ->nullOnDelete();

            $table->index('assignment_mode');
            $table->index('training_program_id');
        });
    }

    public function down(): void
    {
        Schema::table('practice_tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('training_program_id');
            $table->dropColumn('assignment_mode');
        });
    }
};
