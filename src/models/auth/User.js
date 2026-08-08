const { DataTypes } = require("sequelize");

const sequelize = require("../../db.js");


const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      allowNull: false,
      defaultValue: "inactive",
    },

    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    lastPasswordResetAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    
  },
  {
    tableName: "users",

    timestamps: true,

    underscored: true,
  }
);

// export default User;
module.exports = User;