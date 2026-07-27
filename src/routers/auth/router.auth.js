const express = require("express");

const { register, login, home, verifyEmail } = require("../../controllers/auth.controller");
const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.get("/home", authenticate, home);

module.exports = router;
