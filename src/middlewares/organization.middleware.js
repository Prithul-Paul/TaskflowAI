const { Organization, OrganizationMember } = require("../models");

function requireOrganizationRole(allowedRoles = []) {
  return async function (req, res, next) {

    // console.log("Loaded....");
    const { organizationId } = req.params || {};

    // return res.send(organizationId);

    if (!organizationId) {
      return res.status(400).json({ status: false, message: "Organization identifier is required." });
    }

    try {
      let organization = await Organization.findOne({ where: { uuid: organizationId } });


      if (!organization) {
        return res.status(404).json({ status: false, message: "Organization not found." });
      }

      const membership = await OrganizationMember.findOne({ where: { organizationId: organization.id, userId: req.user.id } });

      if (!membership) {
        return res.status(403).json({ status: false, message: "You can not access this organization" });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ status: false, message: "You can not access this organization" });
      }

      // attach for downstream handlers
      req.organization = organization;
      req.organizationMembership = membership;

      return next();
    } catch (error) {
      console.error("Organization role middleware error:", error);
      return res.status(500).json({ status: false, message: "Unable to authorize organization role." });
    }
  };
}

module.exports = { requireOrganizationRole };
