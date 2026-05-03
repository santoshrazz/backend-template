// src/cli/migrate.ts
import { migrator } from "../config/migrator";

const command = process.argv[2];

const run = async () => {
    try {
        switch (command) {
            case "up":
                await migrator.up();
                console.log("✅ Migrations executed");
                break;

            case "down":
                await migrator.down();
                console.log("⏪ Rolled back last migration");
                break;

            case "status": {
                const [executed, pending] = await Promise.all([
                    migrator.executed(),
                    migrator.pending(),
                ]);

                console.log("\n📦 Migration Status\n");

                console.log("✅ Applied:");
                if (!executed.length) console.log("  (none)");
                executed.forEach(m => console.log(`  ✔ ${m.name}`));

                console.log("\n⏳ Pending:");
                if (!pending.length) console.log("  (none)");
                pending.forEach(m => console.log(`  ⏺ ${m.name}`));

                break;
            }

            case "reset":
                await migrator.down({ to: 0 });
                console.log("💥 All migrations reverted");
                break;

            default:
                console.log(`
Usage:
  migrate up        Apply all migrations
  migrate down      Revert last migration
  migrate status    Show migration status
  migrate reset     Revert all migrations
        `);
        }
    } catch (error) {
        console.error("❌ Migration error:", error);
        process.exit(1);
    }
};

run();