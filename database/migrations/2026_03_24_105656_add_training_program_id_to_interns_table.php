<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interns', function (Blueprint $table) {
            $table->foreignId('training_program_id')
                ->nullable()
                ->constrained('training_programs')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('interns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('training_program_id');
        });
    }
};
