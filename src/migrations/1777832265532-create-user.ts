import { QueryInterface, Sequelize } from "sequelize";

type MigrationContext = {
	_sequelize: Sequelize;
	_queryInterface: QueryInterface;
};

export const up = async ({ context }: { context: MigrationContext }) => {
	const { _sequelize, _queryInterface } = context;
	await _sequelize.query(
		"CREATE TABLE IF NOT EXISTS `users` ( `id` INTEGER NOT NULL AUTO_INCREMENT , `name` VARCHAR(255) NOT NULL , `email` VARCHAR(255) NOT NULL , `createdAt` DATETIME NOT NULL , `updatedAt` DATETIME NOT NULL , PRIMARY KEY (`id`) ) ENGINE=InnoDB;",
	);
};

export const down = async ({ context }: { context: MigrationContext }) => {
	const { _sequelize, _queryInterface } = context;
	await _sequelize.query("DROP TABLE IF EXISTS `users`;");
};
