const { Sequelize } = require("sequelize");

const databaseConfig = require("../sequelize-cli.config");

const environment = process.env.NODE_ENV || "development";
const { database, username, password, ...options } = databaseConfig[environment];

const sequelize = new Sequelize(database, username, password, options);

module.exports = sequelize;
