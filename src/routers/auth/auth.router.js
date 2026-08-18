const express = require("express");

const { register, login, loggedInUsr, logout, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } = require("../../controllers/auth/auth.controller");
const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification-email", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/user", authenticate, loggedInUsr);

module.exports = router;
