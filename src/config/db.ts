import { Sequelize } from "sequelize";
import { getOrThrow } from "../utils";
const dbName = getOrThrow("DB_NAME");
const dbUsername = getOrThrow("DB_USERNAME");
const dbPassword = getOrThrow("DB_PASSWORD");

// Verify the server certificate. Set DB_SSL_CA to the provider's CA (PEM, literal
// "\n" sequences allowed) when it isn't in the system trust store.
const dilectOptions = {
	ssl: {
		require: true,
		rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
		...(process.env.DB_SSL_CA && { ca: process.env.DB_SSL_CA.split("\\n").join("\n") }),
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
