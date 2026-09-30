import path from "node:path";
import { SequelizeStorage, Umzug } from "umzug";
import { sequelize } from "./db";

// Resolve relative to this file, not cwd, and match the extension we're running
// as: .ts under ts-node (src/), .js from the compiled build (dist/).
const getMigrationsPath = () => {
	const ext = path.extname(__filename);
	return path.join(__dirname, "..", "migrations", `*${ext}`).split(path.sep).join("/");
};
const migrator = new Umzug({
	migrations: {
		glob: getMigrationsPath(),
		// Always record the name as "<base>.ts" so a DB migrated under ts-node
		// and one migrated from dist/*.js share the same history.
		resolve: params => ({
			...Umzug.defaultResolver(params),
			name: `${path.basename(params.name, path.extname(params.name))}.ts`,
		}),
	},
	context: {
		_sequelize: sequelize,
		_queryInterface: sequelize.getQueryInterface(),
	},
	storage: new SequelizeStorage({ sequelize }),
	logger: console,
});
export { migrator };
