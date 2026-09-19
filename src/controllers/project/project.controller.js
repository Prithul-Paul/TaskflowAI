const { z } = require("zod");

const allowedFields = require("../../helpers/validation");
const { Project, ProjectMember, OrganizationMember, User } = require("../../models");
const sequelize = require("../../db");

const createProjectSchema = z.object({
  name: z
    .string({ error: "name is required." })
    .trim()
    .min(1, "name is required.")
    .max(255, "name must be at most 255 characters."),
  description: z
    .string({ error: "description is required." })
    .trim()
    .optional(),
});

const updateProjectSchema = z.object({
  name: z
    .string({ error: "name is required." })
    .trim()
    .min(1, "name is required.")
    .max(255, "name must be at most 255 characters.")
    .optional(),
  description: z
    .string({ error: "description is required." })
    .trim()
    .optional(),
  status: z.enum(["active", "archived", "completed"], {
    error: "status must be one of active, archived, or completed.",
  }).optional(),
});

const addProjectMemberSchema = z.object({
  user_id: z.union([z.string(), z.number()], { error: "user_id is required." }),
});

function serializeProject(project) {
  return {
    id: project.id,
    organization_id: project.organizationId,
    name: project.name,
    description: project.description,
    status: project.status,
    created_by: project.createdBy,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

async function createProject(req, res) {
  const organization = req.organization;
  const { name, description } = req.body || {};

  const unexpectedFields = allowedFields(req, ["name", "description"]);

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Only name and description are allowed.",
      errors: unexpectedFields.map((field) => ({
        path: [field],
        message: "This field is not allowed.",
      })),
    });
  }

  try {
    const parsedProject = createProjectSchema.safeParse({ name, description });

    if (!parsedProject.success) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: parsedProject.error.issues,
      });
    }

    const validatedProject = parsedProject.data;

    const project = await sequelize.transaction(async (transaction) => {
      const createdProject = await Project.create(
        {
          organizationId: organization.id,
          name: validatedProject.name,
          description: validatedProject.description ?? null,
          status: "active",
          createdBy: req.user.id,
        },
        { transaction }
      );

      await ProjectMember.create(
        {
          projectId: createdProject.id,
          userId: req.user.id,
        },
        { transaction }
      );

      return createdProject;
    });

    return res.status(201).json({
      status: true,
      message: "Project created successfully",
      data: serializeProject(project),
    });
  } catch (error) {
    console.error("Project creation error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        status: false,
        message: "Database validation failed.",
        errors: error.errors.map(({ path, message }) => ({ path: [path], message })),
      });
    }

    return res.status(500).json({
      status: false,
      message: "Unable to create project.",
    });
  }
}

async function getProjects(req, res) {
  const organization = req.organization;
  const membership = req.organizationMembership;

  try {
    let projects;

    if (membership.role === "owner") {
      projects = await Project.findAll({
        where: { organizationId: organization.id },
        order: [["createdAt", "DESC"]],
      });
    } else {
      projects = await Project.findAll({
        where: { organizationId: organization.id },
        include: [
          {
            model: ProjectMember,
            where: { userId: req.user.id },
            attributes: [],
            required: true,
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    }

    return res.status(200).json({
      status: true,
      message: "Projects fetched successfully",
      data: projects.map(serializeProject),
    });
  } catch (error) {
    console.error("Get projects error:", error);
    return res.status(500).json({ status: false, message: "Unable to fetch projects." });
  }
}

async function getProject(req, res) {
  // requireProjectAccess middleware attaches req.project
  const project = req.project;

  try {
    return res.status(200).json({
      status: true,
      message: "Project fetched successfully",
      data: serializeProject(project),
    });
  } catch (error) {
    console.error("Project fetching error:", error);
    return res.status(500).json({
      status: false,
      message: "Unable to fetch project.",
    });
  }
}

async function updateProject(req, res) {
  const organization = req.organization;
  const { projectId } = req.params || {};

  const unexpectedFields = allowedFields(req, ["name", "description", "status"]);

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Only name, description, and status are allowed.",
      errors: unexpectedFields.map((field) => ({
        path: [field],
        message: "This field is not allowed.",
      })),
    });
  }

  const rawBody = req.body || {};

  const parsedUpdate = updateProjectSchema.safeParse({
    name: rawBody.name,
    description: rawBody.description,
    status: rawBody.status,
  });

  if (!parsedUpdate.success) {
    return res.status(400).json({
      status: false,
      message: "Validation failed.",
      errors: parsedUpdate.error.issues,
    });
  }

  const validatedUpdate = parsedUpdate.data;

  const updatePayload = {};

  if (typeof rawBody.name !== "undefined") {
    updatePayload.name = validatedUpdate.name;
  }

  if (typeof rawBody.description !== "undefined") {
    updatePayload.description = validatedUpdate.description ?? null;
  }

  if (typeof rawBody.status !== "undefined") {
    updatePayload.status = validatedUpdate.status;
  }

  try {
    const project = await Project.findOne({ where: { id: projectId, organizationId: organization.id } });

    if (!project) {
      return res.status(404).json({ status: false, message: "Project not found." });
    }

    await project.update(updatePayload);

    return res.status(200).json({
      status: true,
      message: "Project updated successfully",
      data: serializeProject(project),
    });
  } catch (error) {
    console.error("Update project error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        status: false,
        message: "Database validation failed.",
        errors: error.errors.map(({ path, message }) => ({ path: [path], message })),
      });
    }

    return res.status(500).json({
      status: false,
      message: "Unable to update project.",
    });
  }
}

async function deleteProject(req, res) {
  const organization = req.organization;
  const { projectId } = req.params || {};

  try {
    const project = await Project.findOne({ where: { id: projectId, organizationId: organization.id } });

    if (!project) {
      return res.status(404).json({ status: false, message: "Project not found." });
    }

    await project.destroy();

    return res.status(200).json({ status: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({ status: false, message: "Unable to delete project." });
  }
}

async function addProjectMember(req, res) {
  const organization = req.organization;
  const { projectId } = req.params || {};

  const unexpectedFields = allowedFields(req, ["user_id"]);

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Only user_id is allowed.",
      errors: unexpectedFields.map((field) => ({
        path: [field],
        message: "This field is not allowed.",
      })),
    });
  }

  try {
    const parsedMember = addProjectMemberSchema.safeParse(req.body || {});

    if (!parsedMember.success) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: parsedMember.error.issues,
      });
    }

    const { user_id: userId } = parsedMember.data;

    const project = await Project.findOne({ where: { id: projectId, organizationId: organization.id } });

    if (!project) {
      return res.status(404).json({ status: false, message: "Project not found." });
    }

    const organizationMembership = await OrganizationMember.findOne({
      where: { organizationId: organization.id, userId },
    });

    if (!organizationMembership) {
      return res.status(404).json({ status: false, message: "This user is not a member of the organization." });
    }

    const existingProjectMembership = await ProjectMember.findOne({
      where: { projectId: project.id, userId },
    });

    if (existingProjectMembership) {
      return res.status(409).json({ status: false, message: "This user is already assigned to the project." });
    }

    await ProjectMember.create({ projectId: project.id, userId });

    return res.status(201).json({ status: true, message: "Project member added successfully" });
  } catch (error) {
    console.error("Add project member error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        status: false,
        message: "Database validation failed.",
        errors: error.errors.map(({ path, message }) => ({ path: [path], message })),
      });
    }

    return res.status(500).json({
      status: false,
      message: "Unable to add project member.",
    });
  }
}

async function removeProjectMember(req, res) {
  const organization = req.organization;
  const { projectId, userId } = req.params || {};

  try {
    const project = await Project.findOne({ where: { id: projectId, organizationId: organization.id } });

    if (!project) {
      return res.status(404).json({ status: false, message: "Project not found." });
    }

    const projectMembership = await ProjectMember.findOne({
      where: { projectId: project.id, userId },
    });

    if (!projectMembership) {
      return res.status(404).json({ status: false, message: "This user is not assigned to this project." });
    }

    await projectMembership.destroy();

    return res.status(200).json({ status: true, message: "Project member removed successfully" });
  } catch (error) {
    console.error("Remove project member error:", error);
    return res.status(500).json({ status: false, message: "Unable to remove project member." });
  }
}

async function getProjectMembers(req, res) {
  // requireProjectAccess middleware attaches req.project
  const project = req.project;

  try {
    const members = await ProjectMember.findAll({
      where: { projectId: project.id },
      include: [{ model: User, attributes: ["id", "firstName", "lastName", "email"] }],
      order: [["createdAt", "ASC"]],
    });

    const result = members.map((member) => {
      const user = member.User || {};
      return {
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
      };
    });

    return res.status(200).json({
      status: true,
      message: "Project members fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get project members error:", error);
    return res.status(500).json({ status: false, message: "Unable to fetch project members." });
  }
}

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers,
};
