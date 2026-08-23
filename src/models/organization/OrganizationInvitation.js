const { DataTypes } = require("sequelize");

const sequelize = require("../../db.js");

const OrganizationInvitation = sequelize.define(
  "OrganizationInvitation",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },

    organizationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "organizations",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },

    invitedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    role: {
      type: DataTypes.ENUM("admin", "member", "owner"),
      allowNull: false,
    },

    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("pending", "accepted", "expired", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "organization_invitations",
    timestamps: true,
    underscored: true,
  }
);

module.exports = OrganizationInvitation;
