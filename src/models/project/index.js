const { User } = require("../auth");
const { Organization } = require("../organization");
const Project = require("./Project");
const ProjectMember = require("./ProjectMember");

Organization.hasMany(Project, {
  foreignKey: "organizationId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Project.belongsTo(Organization, {
  foreignKey: "organizationId",
});

User.hasMany(Project, {
  foreignKey: "createdBy",
  as: "createdProjects",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Project.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

Project.belongsToMany(User, {
  through: ProjectMember,
  foreignKey: "projectId",
  otherKey: "userId",
  uniqueKey: false,
});

User.belongsToMany(Project, {
  through: ProjectMember,
  foreignKey: "userId",
  otherKey: "projectId",
  uniqueKey: false,
});

Project.hasMany(ProjectMember, {
  foreignKey: "projectId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

ProjectMember.belongsTo(Project, {
  foreignKey: "projectId",
});

User.hasMany(ProjectMember, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

ProjectMember.belongsTo(User, {
  foreignKey: "userId",
});

module.exports = {
  Project,
  ProjectMember,
};
