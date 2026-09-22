import { Sequelize } from "sequelize";

type MigrationContext = {
	_sequelize: Sequelize;
};

export const up = async ({ context }: { context: MigrationContext }) => {
	const { _sequelize } = context;

	await _sequelize.query(`
  	CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP NOT NULL
  );
`);
};

export const down = async ({ context }: { context: MigrationContext }) => {
	const { _sequelize } = context;
	await _sequelize.query(`DROP TABLE IF EXISTS users;`);
};
