const { User } = require("../auth");
const Organization = require("./Organization");
const OrganizationMember = require("./OrganizationMember");

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

module.exports = {
  Organization,
  OrganizationMember,
};
