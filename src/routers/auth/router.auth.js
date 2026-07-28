const express = require("express");

const { register, login, home, verifyEmail, resendVerificationEmail } = require("../../controllers/auth.controller");
const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification-email", resendVerificationEmail);
router.get("/home", authenticate, home);

module.exports = router;
