const express = require("express");

const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers,
} = require("../../controllers/project/project.controller");
const authenticate = require("../../middlewares/auth.middleware");
const { requireOrganizationRole } = require("../../middlewares/organization.middleware");
const { requireProjectAccess } = require("../../middlewares/project.middleware");

const router = express.Router({ mergeParams: true });


// Projects endpoints
router.post("/", authenticate, requireOrganizationRole(["owner", "admin"]), createProject);

router.get("/", authenticate, requireOrganizationRole(), getProjects);

router.get("/:projectId", authenticate, requireOrganizationRole(), requireProjectAccess(), getProject);

router.patch("/:projectId", authenticate, requireOrganizationRole(["owner", "admin"]), requireProjectAccess(), updateProject);

router.delete("/:projectId", authenticate, requireOrganizationRole(["owner", "admin"]), requireProjectAccess(), deleteProject);


// Project members endpoints
router.post("/:projectId/members", authenticate, requireOrganizationRole(["owner", "admin"]), addProjectMember);

router.delete("/:projectId/members/:userId", authenticate, requireOrganizationRole(["owner", "admin"]), removeProjectMember);

router.get("/:projectId/members", authenticate, requireOrganizationRole(), requireProjectAccess(), getProjectMembers);

module.exports = router;
