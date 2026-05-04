import { migrator, sequelize } from "../config";

// Initialize DB Connection
async function initializeDatabase() {
	try {
		await sequelize.authenticate();
		console.log("✅ Database connection established successfully");
	} catch (error) {
		console.error("❌ Unable to connect to the database:", error);
		process.exit(1);
	}
}

// Run startup migrations
async function runStartupMigrations() {
	try {
		const migrations = await migrator.up();
		if (migrations.length > 0) {
			console.log(`✅ Executed ${migrations.length} migration(s)`);
		} else {
			console.log("📦 All migrations already applied");
		}
	} catch (error) {
		console.error("❌ Migration error:", error);
		process.exit(1);
	}
}

// Initialize everything in the correct order
async function initializeEnvironment() {
	await initializeDatabase(); // 1. Connect to database (env vars already loaded)
	await runStartupMigrations(); // 2. Run migrations
}

export { initializeEnvironment };
