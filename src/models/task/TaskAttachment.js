const { DataTypes } = require("sequelize");

const sequelize = require("../../db.js");

const TaskAttachment = sequelize.define(
  "TaskAttachment",
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

    projectId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "projects",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    taskId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "tasks",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    uploadedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    storageKey: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },

    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    sizeBytes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: "task_attachments",
    timestamps: true,
    underscored: true,
    // The on-disk path must never leak into API responses; opt in with .scope("withStorageKey").
    defaultScope: {
      attributes: { exclude: ["storageKey"] },
    },
    scopes: {
      withStorageKey: {
        attributes: { include: ["storageKey"] },
      },
    },
  }
);

module.exports = TaskAttachment;
