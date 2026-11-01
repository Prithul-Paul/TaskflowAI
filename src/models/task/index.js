const { User } = require("../auth");
const { Organization } = require("../organization");
const { Project } = require("../project");
const Task = require("./Task");
const TaskAttachment = require("./TaskAttachment");
const { TASK_STATUSES, TASK_PRIORITIES } = require("./constants");

// Cascades are enforced by the DB foreign keys (see migrations), not by association hooks.
Project.hasMany(Task, {
  foreignKey: "projectId",
  as: "tasks",
});

Task.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

Organization.hasMany(Task, {
  foreignKey: "organizationId",
  as: "tasks",
});

Task.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});

Task.hasMany(TaskAttachment, {
  foreignKey: "taskId",
  as: "attachments",
});

TaskAttachment.belongsTo(Task, {
  foreignKey: "taskId",
  as: "task",
});

User.hasMany(TaskAttachment, {
  foreignKey: "uploadedBy",
  as: "uploadedAttachments",
});

TaskAttachment.belongsTo(User, {
  foreignKey: "uploadedBy",
  as: "uploader",
});

module.exports = {
  Task,
  TaskAttachment,
  TASK_STATUSES,
  TASK_PRIORITIES,
};
