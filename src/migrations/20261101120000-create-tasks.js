'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tasks', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

      organization_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      project_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      task_number: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },

      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      status: {
        type: Sequelize.ENUM('todo', 'in_progress', 'in_review', 'done', 'cancelled'),
        allowNull: false,
        defaultValue: 'todo',
      },

      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
      },

      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      position: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('tasks', ['project_id', 'task_number'], {
      unique: true,
      name: 'tasks_project_id_task_number_unique',
    });
    await queryInterface.addIndex('tasks', ['project_id', 'status']);
    await queryInterface.addIndex('tasks', ['project_id', 'due_date']);
    await queryInterface.addIndex('tasks', ['organization_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tasks');
  },
};
