const express = require("express");

const projectRouter = require("./project.router");

const app = express.Router();

app.use("/organization/:organizationId/projects", projectRouter);

module.exports = app;
