// scripts/create-migration.ts
import fs from "node:fs";
import path from "node:path";

const name = process.argv[2];

if (!name) {
	console.error("❌ Please provide migration name");
	process.exit(1);
}

const migrationDir = path.join("src", "migrations");
if (!fs.existsSync(migrationDir)) {
	fs.mkdirSync(migrationDir, { recursive: true });
}
const timestamp = Date.now();
const fileName = `${timestamp}-${name}.ts`;
const filePath = path.join(migrationDir, fileName);

const template = `
import { QueryInterface, Sequelize, DataTypes } from "sequelize";

type MigrationContext = {
  sequelize: Sequelize;
  queryInterface: QueryInterface;
};

export const up = async ({ context }: { context: MigrationContext }) => {
  const { _sequelize, _queryInterface } = context;
  // TODO: Implement migration up logic here. 
};

export const down = async ({ context }: { context: MigrationContext }) => {
  const { _sequelize, _queryInterface } = context;
  // TODO: Implement migration down logic here. 
};
`;

fs.writeFileSync(filePath, template.trim());

console.log("✅ Migration created:", filePath);
