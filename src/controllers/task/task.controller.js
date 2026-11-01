const { z } = require("zod");

const allowedFields = require("../../helpers/validation");
const { Task, TASK_STATUSES, TASK_PRIORITIES } = require("../../models");

const TASK_FIELDS = ["title", "description", "status", "priority", "dueDate"];

// due_date is a DATE column and the DB runs in UTC, so "today" is the UTC date.
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

const titleSchema = z
  .string({ error: "title is required." })
  .trim()
  .min(1, "title is required.")
  .max(100, "title must be at most 100 characters.");

const descriptionSchema = z
  .string({ error: "description must be a string." })
  .trim()
  .nullable()
  .optional();

const statusSchema = z
  .enum(TASK_STATUSES, { error: `status must be one of ${TASK_STATUSES.join(", ")}.` })
  .optional();

const prioritySchema = z
  .enum(TASK_PRIORITIES, { error: `priority must be one of ${TASK_PRIORITIES.join(", ")}.` })
  .optional();

const dueDateSchema = z
  .iso.date({ error: "dueDate must be a valid date in YYYY-MM-DD format.", abort: true })
  .refine((value) => value >= todayDate(), "dueDate can not be a past date.")
  .nullable()
  .optional();

const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  status: statusSchema,
  priority: prioritySchema,
  dueDate: dueDateSchema,
});

const updateTaskSchema = createTaskSchema.extend({
  title: titleSchema.optional(),
});

function serializeTask(task) {
  return {
    id: task.id,
    task_number: task.taskNumber,
    organization_id: task.organizationId,
    project_id: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate,
    completed_at: task.completedAt,
    position: task.position ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

// Common response helpers shared by the task handlers.
function rejectUnexpectedFields(req, res) {
  const unexpectedFields = allowedFields(req, TASK_FIELDS);

  if (unexpectedFields.length === 0) {
    return false;
  }

  res.status(400).json({
    status: false,
    message: `Only ${TASK_FIELDS.join(", ")} are allowed.`,
    errors: unexpectedFields.map((field) => ({
      path: [field],
      message: "This field is not allowed.",
    })),
  });

  return true;
}

function parseTaskBody(schema, req, res) {
  const parsedTask = schema.safeParse(req.body || {});

  if (!parsedTask.success) {
    res.status(400).json({
      status: false,
      message: "Validation failed.",
      errors: parsedTask.error.issues,
    });

    return null;
  }

  return parsedTask.data;
}

function handleTaskError(res, error, logLabel, message) {
  console.error(`${logLabel}:`, error);

  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({
      status: false,
      message: "Database validation failed.",
      errors: error.errors.map(({ path, message }) => ({ path: [path], message })),
    });
  }

  return res.status(500).json({ status: false, message });
}

// completed_at follows the status: set when a task becomes done, cleared when it leaves done.
function completedAtFor(status, task) {
  if (status !== "done") {
    return null;
  }

  return task && task.status === "done" ? task.completedAt : new Date();
}

async function createTask(req, res) {
  // requireProjectMember middleware attaches req.project
  const project = req.project;

  if (rejectUnexpectedFields(req, res)) {
    return;
  }

  const validatedTask = parseTaskBody(createTaskSchema, req, res);

  if (!validatedTask) {
    return;
  }

  try {
    const status = validatedTask.status ?? "todo";

    const task = await Task.create({
      organizationId: project.organizationId,
      projectId: project.id,
      title: validatedTask.title,
      description: validatedTask.description ?? null,
      status,
      priority: validatedTask.priority ?? "medium",
      dueDate: validatedTask.dueDate ?? null,
      completedAt: completedAtFor(status),
    });

    return res.status(201).json({
      status: true,
      message: "Task created successfully",
      data: serializeTask(task),
    });
  } catch (error) {
    return handleTaskError(res, error, "Task creation error", "Unable to create task.");
  }
}

async function getTask(req, res) {
  // requireTaskAccess middleware attaches req.task
  const task = req.task;

  try {
    return res.status(200).json({
      status: true,
      message: "Task fetched successfully",
      data: serializeTask(task),
    });
  } catch (error) {
    return handleTaskError(res, error, "Task fetching error", "Unable to fetch task.");
  }
}

async function updateTask(req, res) {
  // requireTaskAccess middleware attaches req.task
  const task = req.task;

  if (rejectUnexpectedFields(req, res)) {
    return;
  }

  const validatedUpdate = parseTaskBody(updateTaskSchema, req, res);

  if (!validatedUpdate) {
    return;
  }

  // Only fields actually sent are updated; null clears description / dueDate.
  const updatePayload = {};

  TASK_FIELDS.forEach((field) => {
    if (typeof validatedUpdate[field] !== "undefined") {
      updatePayload[field] = validatedUpdate[field];
    }
  });

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ status: false, message: "No fields to update." });
  }

  if (typeof updatePayload.status !== "undefined") {
    updatePayload.completedAt = completedAtFor(updatePayload.status, task);
  }

  try {
    await task.update(updatePayload);

    return res.status(200).json({
      status: true,
      message: "Task updated successfully",
      data: serializeTask(task),
    });
  } catch (error) {
    return handleTaskError(res, error, "Update task error", "Unable to update task.");
  }
}

async function deleteTask(req, res) {
  // requireTaskAccess middleware attaches req.task
  const task = req.task;

  try {
    // Task is paranoid, so destroy() only sets deleted_at.
    await task.destroy();

    return res.status(200).json({ status: true, message: "Task deleted successfully" });
  } catch (error) {
    return handleTaskError(res, error, "Delete task error", "Unable to delete task.");
  }
}

module.exports = {
  createTask,
  getTask,
  updateTask,
  deleteTask,
};
