require("dotenv").config();

// Shared by sequelize-cli (migrations) and src/db.js (the app), so both always hit the same database.
function buildConfig({ requireEnv = false } = {}) {
  if (requireEnv) {
    const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required database environment variables: ${missing.join(", ")}`);
    }
  }

  const config = {
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "test",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
    timezone: "+00:00",
    pool: {
      max: Number(process.env.DB_POOL_MAX) || 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  };

  // Managed MySQL providers usually require TLS.
  if (process.env.DB_SSL === "true") {
    config.dialectOptions = {
      ssl: {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
      },
    };
  }

  return config;
}

module.exports = {
  development: buildConfig(),
  test: buildConfig(),
  get production() {
    // Only validated when production is actually selected, so dev without these vars still works.
    return buildConfig({ requireEnv: true });
  },
};
