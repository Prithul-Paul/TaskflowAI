const { Project, ProjectMember } = require("../models");

function requireProjectAccess() {
  return async function (req, res, next) {
    const { projectId } = req.params || {};
    const organization = req.organization;
    const membership = req.organizationMembership;

    if (!projectId) {
      return res.status(400).json({ status: false, message: "Project identifier is required." });
    }

    try {
      const project = await Project.findOne({ where: { id: projectId, organizationId: organization.id } });

      if (!project) {
        return res.status(404).json({ status: false, message: "Project not found." });
      }

      if (membership.role !== "owner") {
        const projectMembership = await ProjectMember.findOne({ where: { projectId: project.id, userId: req.user.id } });

        if (!projectMembership) {
          return res.status(403).json({ status: false, message: "You can not access this project" });
        }
      }

      // attach for downstream handlers
      req.project = project;

      return next();
    } catch (error) {
      console.error("Project access middleware error:", error);
      return res.status(500).json({ status: false, message: "Unable to authorize project access." });
    }
  };
}

module.exports = { requireProjectAccess };
