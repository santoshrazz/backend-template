import { Sequelize } from "sequelize";
import { getOrThrow } from "../utils";
const dbName = getOrThrow("DB_NAME");
const dbUsername = getOrThrow("DB_USERNAME");
const dbPassword = getOrThrow("DB_PASSWORD");

const dilectOptions = {
	ssl: {
		require: true,
		rejectUnauthorized: false,
	},
};
const sequelize = new Sequelize(dbName, dbUsername, dbPassword, {
	host: getOrThrow("DB_HOST") || "localhost",
	dialect: "postgres",
	pool: {
		max: 5,
		min: 0,
		acquire: 30000,
		idle: 10000,
	},
	dialectOptions: process.env.NODE_ENV === "production" ? dilectOptions : {},
});

export { sequelize };
