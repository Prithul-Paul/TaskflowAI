const { Project, ProjectMember, Organization, OrganizationMember, Task } = require("../models");

// Task routes are not nested under an organization, so the organization is resolved from the project.
function requireProjectMember() {
  return async function (req, res, next) {
    const { projectId } = req.params || {};

    if (!projectId) {
      return res.status(400).json({ status: false, message: "Project identifier is required." });
    }

    try {
      const project = await Project.findByPk(projectId, {
        
          include: [{
              model: ProjectMember,
              where: { userId: req.user.id },
              attributes: ["id"],
              required: false
          },
          {
            model: Organization,
            include: [
              {
                model: OrganizationMember,
                where: { userId: req.user.id },
                attributes: ["id", "role"],
                required: false,
              },
            ],
          }],
      });

      //     

      // const project = await Project.findByPk(projectId);
      // res.json(project);
      // return;

      // A soft-deleted organization is excluded from the include, so its projects are hidden too.
      if (!project || !project.Organization) {
        return res.status(404).json({ status: false, message: "Project not found." });
      }

      const [membership] = project.Organization.OrganizationMembers;

      // Only members of this project can work with its tasks; organization owners get no bypass here.
      if (!membership || project.ProjectMembers.length === 0) {
        return res.status(403).json({ status: false, message: "You can not access this project" });
      }

      // attach for downstream handlers
      req.project = project;
      req.organization = project.Organization;
      req.organizationMembership = membership;

      return next();
    } catch (error) {
      console.error("Project member middleware error:", error);
      return res.status(500).json({ status: false, message: "Unable to authorize project access." });
    }
  };
}

// Must run after requireProjectMember.
function requireTaskAccess() {
  return async function (req, res, next) {
    const { taskId } = req.params || {};

    if (!taskId) {
      return res.status(400).json({ status: false, message: "Task identifier is required." });
    }

    try {
      // :taskId is the public task_number (UUID), like organizations use uuid in their routes.
      const task = await Task.findOne({ where: { taskNumber: taskId, projectId: req.project.id } });

      if (!task) {
        return res.status(404).json({ status: false, message: "Task not found." });
      }

      // attach for downstream handlers
      req.task = task;

      return next();
    } catch (error) {
      console.error("Task access middleware error:", error);
      return res.status(500).json({ status: false, message: "Unable to authorize task access." });
    }
  };
}

module.exports = { requireProjectMember, requireTaskAccess };
