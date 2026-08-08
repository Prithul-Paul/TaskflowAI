const { DataTypes } = require("sequelize");

const sequelize = require("../../db");

const PasswordHistory = sequelize.define(
  "PasswordHistory",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "password_histories",
    timestamps: true,
    underscored: true,
  }
);

module.exports = PasswordHistory;
