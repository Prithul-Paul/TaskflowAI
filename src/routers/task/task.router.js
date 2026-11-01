const express = require("express");

const {
  createTask,
  getTask,
  updateTask,
  deleteTask,
} = require("../../controllers/task/task.controller");
const authenticate = require("../../middlewares/auth.middleware");
const { requireProjectMember, requireTaskAccess } = require("../../middlewares/task.middleware");

const router = express.Router({ mergeParams: true });


// Tasks endpoints
router.post("/", authenticate, requireProjectMember(), createTask);

router.get("/:taskId", authenticate, requireProjectMember(), requireTaskAccess(), getTask);

router.patch("/:taskId", authenticate, requireProjectMember(), requireTaskAccess(), updateTask);

router.delete("/:taskId", authenticate, requireProjectMember(), requireTaskAccess(), deleteTask);

module.exports = router;
