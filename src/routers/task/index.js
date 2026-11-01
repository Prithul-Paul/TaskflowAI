const express = require("express");

const taskRouter = require("./task.router");

const app = express.Router();

app.use("/projects/:projectId/tasks", taskRouter);

module.exports = app;
