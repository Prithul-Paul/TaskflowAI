const { DataTypes } = require("sequelize");

const sequelize = require("../../db.js");

const Organization = sequelize.define(
  "Organization",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
    },

    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("Active", "Inactive", "Suspended"),
      allowNull: false,
      defaultValue: "Active",
    },
  },
  {
    tableName: "organizations",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Organization;
