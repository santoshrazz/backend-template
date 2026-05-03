import path from "node:path";
import { SequelizeStorage, Umzug } from "umzug";
import { sequelize } from "./db";

const getMigrationsPath = () => {
	return path.join(process.cwd(), "src", "migrations", "*.ts");
};
const migrator = new Umzug({
	migrations: {
		glob: getMigrationsPath(),
	},
	context: {
		sequelize,
		queryInterface: sequelize.getQueryInterface(),
	},
	storage: new SequelizeStorage({ sequelize }),
	logger: console,
});
export { migrator };
