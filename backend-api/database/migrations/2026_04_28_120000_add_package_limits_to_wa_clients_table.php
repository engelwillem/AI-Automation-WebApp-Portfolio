<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wa_clients', function (Blueprint $table): void {
            if (! Schema::hasColumn('wa_clients', 'package')) {
                $table->string('package')->nullable()->after('default_timezone');
            }

            if (! Schema::hasColumn('wa_clients', 'daily_limit')) {
                $table->unsignedInteger('daily_limit')->nullable()->after('package');
            }

            if (! Schema::hasColumn('wa_clients', 'monthly_limit')) {
                $table->unsignedInteger('monthly_limit')->nullable()->after('daily_limit');
            }
        });
    }

    public function down(): void
    {
        Schema::table('wa_clients', function (Blueprint $table): void {
            if (Schema::hasColumn('wa_clients', 'monthly_limit')) {
                $table->dropColumn('monthly_limit');
            }

            if (Schema::hasColumn('wa_clients', 'daily_limit')) {
                $table->dropColumn('daily_limit');
            }

            if (Schema::hasColumn('wa_clients', 'package')) {
                $table->dropColumn('package');
            }
        });
    }
};

