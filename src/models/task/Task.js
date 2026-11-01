const { DataTypes } = require("sequelize");

const sequelize = require("../../db.js");
const { TASK_STATUSES, TASK_PRIORITIES } = require("./constants");

const Task = sequelize.define(
  "Task",
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

    taskNumber: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },

    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(...TASK_STATUSES),
      allowNull: false,
      defaultValue: "todo",
      validate: {
        isIn: [TASK_STATUSES],
      },
    },

    priority: {
      type: DataTypes.ENUM(...TASK_PRIORITIES),
      allowNull: false,
      defaultValue: "medium",
      validate: {
        isIn: [TASK_PRIORITIES],
      },
    },

    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    position: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "tasks",
    timestamps: true,
    underscored: true,
    paranoid: true,
    deletedAt: "deleted_at",
    indexes: [
      {
        unique: true,
        fields: ["project_id", "task_number"],
        name: "tasks_project_id_task_number_unique",
      },
    ],
  }
);

module.exports = Task;
