const express = require("express");

const organizationRouter = require("./organization.router");

const app = express.Router();

app.use("/organization", organizationRouter);

module.exports = app;
