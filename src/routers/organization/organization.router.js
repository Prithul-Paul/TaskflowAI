const express = require("express");

const {
  createOrganization,
  getAllOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  updateOrganizationMemberRole,
  deleteOrganizationMember,
} = require("../../controllers/organization/organization.controller");
const authenticate = require("../../middlewares/auth.middleware");
const { requireOrganizationRole } = require("../../middlewares/organization.middleware");

const router = express.Router();


// Organizations endpoints
router.post("/", authenticate, createOrganization);

router.get("/", authenticate, getAllOrganizations);

router.get("/:organizationId", authenticate, requireOrganizationRole(), getOrganization);

router.patch("/:organizationId", authenticate, requireOrganizationRole(["owner"]), updateOrganization);

router.delete("/:organizationId", authenticate, requireOrganizationRole(["owner"]), deleteOrganization);

// Members endpoints
router.get("/:organizationId/members", authenticate, requireOrganizationRole(), getOrganizationMembers);

router.patch("/:organizationId/members/:userId", authenticate, requireOrganizationRole(["owner"]), updateOrganizationMemberRole);

router.delete("/:organizationId/members/:userId", authenticate, requireOrganizationRole(["owner"]), deleteOrganizationMember);

module.exports = router;
