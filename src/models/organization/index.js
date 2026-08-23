const { User } = require("../auth");
const Organization = require("./Organization");
const OrganizationMember = require("./OrganizationMember");
const OrganizationInvitation = require("./OrganizationInvitation");

User.hasMany(OrganizationMember, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

OrganizationMember.belongsTo(User, {
  foreignKey: "userId",
});

Organization.hasMany(OrganizationMember, {
  foreignKey: "organizationId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

OrganizationMember.belongsTo(Organization, {
  foreignKey: "organizationId",
});

User.hasMany(OrganizationInvitation, {
  foreignKey: "invitedBy",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

OrganizationInvitation.belongsTo(User, {
  foreignKey: "invitedBy",
});

Organization.hasMany(OrganizationInvitation, {
  foreignKey: "organizationId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

OrganizationInvitation.belongsTo(Organization, {
  foreignKey: "organizationId",
});

module.exports = {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
};
