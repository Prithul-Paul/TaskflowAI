'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_attachments', {
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

      task_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'tasks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      uploaded_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      note: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      original_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      storage_key: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },

      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      size_bytes: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('task_attachments', ['task_id', 'created_at']);
    await queryInterface.addIndex('task_attachments', ['storage_key'], {
      unique: true,
    });
    await queryInterface.addIndex('task_attachments', ['project_id']);
    await queryInterface.addIndex('task_attachments', ['organization_id']);
    await queryInterface.addIndex('task_attachments', ['uploaded_by']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('task_attachments');
  },
};
