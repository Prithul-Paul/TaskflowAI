const express = require("express");

const {
  createOrganization,
  getAllOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
} = require("../../controllers/organization/organization.controller");
const authenticate = require("../../middlewares/auth.middleware");
const { requireOrganizationRole } = require("../../middlewares/organization.middleware");

const router = express.Router();

// POST   /v1/api/organizations
router.post("/", authenticate, createOrganization);

// GET    /v1/api/organizations
router.get("/", authenticate, getAllOrganizations);

// GET    /v1/api/organizations/:organizationId
router.get("/:organizationId", authenticate, getOrganization);

// PATCH  /v1/api/organizations/:organizationId
router.patch("/:organizationId", authenticate, requireOrganizationRole(["owner"]), updateOrganization);

// DELETE /v1/api/organizations/:organizationId
router.delete("/:organizationId", authenticate, requireOrganizationRole(["owner"]), deleteOrganization);

module.exports = router;
