const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const allowedFields = require("../../helpers/validation");
const { Organization, OrganizationMember, User } = require("../../models");
const sequelize = require("../../db");

const createOrganizationSchema = z.object({
  organization_name: z
    .string({ error: "organization_name is required." })
    .trim()
    .min(1, "organization_name is required.")
    .max(100, "organization_name must be at most 100 characters."),
});

const updateOrganizationSchema = z.object({
  organization_name: z
    .string({ error: "organization_name is required." })
    .trim()
    .min(1, "organization_name is required.")
    .max(100, "organization_name must be at most 100 characters."),
  description: z
    .string({ error: "description is required." })
    .trim()
    .max(255, "description must be at most 255 characters.")
    .optional(),
});

const roleSchema = z.object({ role: z.string() });


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
        uuid: organization.uuid,
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
      include: [
        {
          model: Organization,
          include: [
            {
              model: OrganizationMember,
              where: { role: "owner" },
              include: [{ model: User, attributes: ["id", "email", "firstName", "lastName"] }],
            },
          ],
        },
      ],
    });

    // return res.send(memberships);

    const organizations = memberships.map((membership) => {
      const org = membership.Organization || {};
      const owner = org.OrganizationMembers?.[0]?.User || {};
      // const org = membership.Organization || {};

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        logo_url: org.logoUrl,
        status: org.status,
        uuid: org.uuid,
        role: membership.role,
        created_at: org.createdAt,
        owner: {
          id: owner.id,
          email: owner.email,
          name: `${owner.firstName || ""} ${owner.lastName || ""}`.trim(),
        },

      };
    });

    return res.status(200).json({
      status: true,
      message: "Organizations fetched successfully",
      data: organizations,
    });
  } catch (error) {
    console.error("Get all organizations error:", error);
    return res.status(500).json({ status: false, message: "Unable to fetch organizations." });
  }
}

async function getOrganization(req, res) {
  // requireOrganizationRole middleware attaches req.organization
  const organization = req.organization;
  const membership = req.organizationMembership;


  try{
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
  const unexpectedFields = allowedFields(req, ["organization_name", "description", "logo_url"]);

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Only organization_name, description, and logo_url are allowed.",
      errors: unexpectedFields.map((field) => ({
        path: [field],
        message: "This field is not allowed.",
      })),
    });
  }

  const uploadFile = req.files && req.files.org_logo ? req.files.org_logo : null;
  const rawBody = req.body || {};


  const parsedUpdate = updateOrganizationSchema.safeParse({ organization_name: rawBody.organization_name, description: rawBody.description,});

  if (!parsedUpdate.success) {
    return res.status(400).json({
      status: false,
      message: "Validation failed.",
      errors: parsedUpdate.error.issues,
    });
  }

  const validatedUpdate = parsedUpdate.data;
  
  const updatePayload = {
    name: validatedUpdate.organization_name,
    slug: slugify(validatedUpdate.organization_name),
  };

  if (typeof rawBody.description !== "undefined") {
    updatePayload.description = validatedUpdate.description ?? null;
  }

  if (uploadFile) {
    const fileName = uploadFile.name || uploadFile.originalname || "logo";
    const fileExtension = path.extname(fileName).toLowerCase().replace(".", "");
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const maxFileSize = 100 * 1024 * 1024;

    if (uploadFile.size > maxFileSize) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: [{ path: ["logo_url"], message: "logo_url file exceeds the maximum allowed size of 100 MB." }],
      });
    }

    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: [{ path: ["logo_url"], message: "logo_url file type is not supported. Allowed types: jpg, jpeg, png, webp." }],
      });
    }

    const storageDir = path.join(process.cwd(), "storage");
    const sanitizedFileName = `${Date.now()}-${fileName.replace(/\s+/g, "-")}`;
    const uploadPath = path.join(storageDir, sanitizedFileName);

    try {
      await uploadFile.mv(uploadPath);
      updatePayload.logoUrl = `/storage/${sanitizedFileName}`;
    } catch (error) {
      console.error("Logo upload error:", error);
      return res.status(500).json({
        status: false,
        message: "Unable to upload logo.",
      });
    }
  }

  try {
    const organization = req.organization;
    await organization.update(updatePayload);

    return res.status(200).json({
      status: true,
      message: "Organization updated successfully",
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
    console.error("Update organization error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        status: false,
        message: "Database validation failed.",
        errors: error.errors.map(({ path, message }) => ({ path: [path], message })),
      });
    }

    return res.status(500).json({
      status: false,
      message: "Unable to update organization.",
    });
  }
}


async function getOrganizationMembers(req, res) {
  
  const organization = req.organization;
  const membership = req.organizationMembership;

  
  try {
    const members = await OrganizationMember.findAll({
      where: { organizationId: organization.id },
      include: [{ model: User, attributes: ["id", "firstName", "lastName", "email"] }],
    });

    const result = members.map((m) => {
      const u = m.User || {};
      return {
        id: u.id,
        first_name: u.firstName,
        last_name: u.lastName,
        email: u.email,
        role: m.role,
      };
    });

    return res.status(200).json({ status: true, message: "Organization members fetched successfully", data: result });
  } catch (error) {
    console.error("Get organization members error:", error);
    return res.status(500).json({ status: false, message: "Unable to fetch organization members." });
  }
}

async function updateOrganizationMemberRole(req, res) {
  const { userId } = req.params || {};

  

  if (!userId) {
    return res.status(400).json({ status: false, message: "Organization and user identifiers are required." });
  }

  try {

    const organization = req.organization;
    // parse role
    const parsed = roleSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ status: false, message: "Validation failed.", errors: parsed.error.issues });
    }

    const role = (parsed.data.role || "").toLowerCase();
    const allowed = ["admin", "member"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ status: false, message: "This is not one of the approved roles." });
    }

    // owner must not change their own role
    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ status: false, message: "Owner cannot change their own role." });
    }

    const targetMembership = await OrganizationMember.findOne({ where: { organizationId: organization.id, userId } });
    if (!targetMembership) {
      return res.status(403).json({ status: false, message: "You can not access this organization" });
    }

    await targetMembership.update({ role });

    return res.status(200).json({ status: true, message: "Organization member role updated successfully" });
  } catch (error) {
    console.error("Update member role error:", error);
    return res.status(500).json({ status: false, message: "Unable to update member role." });
  }
}

async function deleteOrganizationMember(req, res) {
  const { organizationId, userId } = req.params || {};

  if (!organizationId || !userId) {
    return res.status(400).json({ status: false, message: "Organization and user identifiers are required." });
  }

  try {
    const organization = req.organization;
    
    // owner must not delete themselves
    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ status: false, message: "Owner cannot remove themselves." });
    }

    const targetMembership = await OrganizationMember.findOne({ where: { organizationId: organization.id, userId } });
    if (!targetMembership) {
      return res.status(403).json({ status: false, message: "You can not access this organization" });
    }

    await targetMembership.destroy();

    return res.status(200).json({ status: true, message: "Organization member removed successfully" });
  } catch (error) {
    console.error("Delete organization member error:", error);
    return res.status(500).json({ status: false, message: "Unable to remove organization member." });
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

module.exports = { createOrganization, getAllOrganizations, getOrganization, updateOrganization, deleteOrganization, getOrganizationMembers, updateOrganizationMemberRole, deleteOrganizationMember };
