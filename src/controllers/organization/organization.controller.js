const { z } = require("zod");

const allowedFields = require("../../helpers/validation");
const { Organization, OrganizationMember } = require("../../models");
const sequelize = require("../../db");

const createOrganizationSchema = z.object({
  organization_name: z
    .string({ error: "organization_name is required." })
    .trim()
    .min(1, "organization_name is required.")
    .max(100, "organization_name must be at most 100 characters."),
});

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "organization";
}

async function createOrganization(req, res) {
  const { organization_name } = req.body || {};

  const unexpectedFields = allowedFields(req, ["organization_name"]);

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Only organization_name is allowed.",
      errors: unexpectedFields.map((field) => ({
        path: [field],
        message: "This field is not allowed.",
      })),
    });
  }

  try {
    const parsedOrganization = createOrganizationSchema.safeParse({ organization_name });

    if (!parsedOrganization.success) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: parsedOrganization.error.issues,
      });
    }

    const validatedOrganization = parsedOrganization.data;

    const organization = await sequelize.transaction(async (transaction) => {
      const createdOrganization = await Organization.create(
        {
          name: validatedOrganization.organization_name,
          slug: slugify(validatedOrganization.organization_name),
          description: null,
          logoUrl: null,
          status: "active",
        },
        { transaction }
      );

      await OrganizationMember.create(
        {
          organizationId: createdOrganization.id,
          userId: req.user.id,
          role: "owner",
        },
        { transaction }
      );

      return createdOrganization;
    });

    return res.status(201).json({
      status: true,
      message: "Organization created successfully",
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        logo_url: organization.logoUrl,
        status: organization.status,
      },
    });
  } catch (error) {
    console.error("Organization creation error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        status: false,
        message: "Organization with this name already exists.",
      });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        status: false,
        message: "Database validation failed.",
        errors: error.errors.map(({ path, message }) => ({ path: [path], message })),
      });
    }

    return res.status(500).json({
      status: false,
      message: "Unable to create organization.",
    });
  }
}

async function getAllOrganizations(req, res) {
  try {
    const memberships = await OrganizationMember.findAll({
      where: { userId: req.user.id },
      include: [{ model: Organization }],
    });

    const organizations = memberships.map((m) => {
      const org = m.Organization;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        logo_url: org.logoUrl,
        status: org.status,
        uuid: org.uuid,
      };
    });

    return res.status(200).json({ status: true, message: "Organizations fetched successfully", data: organizations });
  } catch (error) {
    console.error("Get all organizations error:", error);
    return res.status(500).json({ status: false, message: "Unable to fetch organizations." });
  }
}

async function getOrganization(req, res) {
  // requireOrganizationRole middleware attaches req.organization
  // const organization = req.organization;
  // const membership = req.organizationMembership;

  const { organizationId } = req.params || {};

    // return res.send(organizationId);

  if (!organizationId) {
    return res.status(400).json({ status: false, message: "Organization identifier is required." });
  }

  try{

    const organization = await Organization.findOne({ where: { uuid: organizationId } });

    if (!organization) {
      return res.status(404).json({ status: false, message: "Organization not found." });
    }

    const membership = await OrganizationMember.findOne({ where: { organizationId: organization.id, userId: req.user.id } });

    if (!membership) {
      return res.status(403).json({ status: false, message: "You can not access this organization" });
    }

    
    if (!organization) {
      return res.status(404).json({ status: false, message: "Organization not found." });
    }
  
    return res.status(200).json({
      status: true,
      message: "Organization fetched successfully",
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          logo_url: organization.logoUrl,
          status: organization.status,
        },
        membership: {
          role: membership.role
        }
      },
    });
    
  }catch(error){
    console.error("Organization fetching error:", error);
    return res.status(500).json({
      status: false,
      message: "Unable to create organization.",
    });
  }
}

async function updateOrganization(req, res) {
  // Minimal update handler following project patterns
  const unexpectedFields = allowedFields(req, ["organization_name"]);
  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Only organization_name is allowed.",
      errors: unexpectedFields.map((field) => ({ path: [field], message: "This field is not allowed." })),
    });
  }

}

async function deleteOrganization(req, res) {
  try {
    const organization = req.organization;
    await organization.destroy();
    return res.status(200).json({ status: true, message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Delete organization error:", error);
    return res.status(500).json({ status: false, message: "Unable to delete organization." });
  }
}

module.exports = { createOrganization, getAllOrganizations, getOrganization, updateOrganization, deleteOrganization };
