const express = require("express");

const authRouter = require("./auth.router");

const app = express.Router();

app.use("/auth", authRouter);

module.exports = app;
