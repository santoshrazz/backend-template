import { Sequelize } from "sequelize"

const sequelize = new Sequelize('database', 'username', 'password', {
    host: process.env.DB_HOST || 'localhost',
    dialect: "postgres",
    username: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

export { sequelize }