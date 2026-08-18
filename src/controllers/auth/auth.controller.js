const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { z } = require("zod");


const allowedFields = require("../../helpers/validation");

const { User, EmailVerificationToken, PasswordResetToken, PasswordHistory } = require("../../models/auth");
const { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetConfirmationEmail } = require("../../services/email.service");
const refreshEmailVerificationToken = require("../../services/auth/refreshEmailverificationtoken.service");
// const requestPasswordReset = require("../services/requestPasswordReset.service");
const { type } = require("os");
const refreshPasswordResetToken = require("../../services/auth/refreshPasswordResetToken.service");

const passwordSchema = z
  .string({ error: "password is required." })
  .trim()
  .max(20)
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character");

const registerSchema = z
  .object({
    first_name: z.string({ error: "first_name is required." }).trim().min(3).max(10),
    last_name: z.string({ error: "last_name is required." }).trim().min(3).max(10),
    email: z.string({ error: "email is required." }).trim().email(),
    password: passwordSchema,
    cpassword: z.string({ error: "cpassword is required." }),
  })
  .refine((data) => data.password === data.cpassword, {
    error: "Passwords don't match!",
    path: ["cpassword"],
  });

const resetPasswordSchema = z
  .object({
    token: z.string({ error: "token is required." }).trim().min(1, "token is required."),
    password: passwordSchema,
    cpassword: z.string({ error: "cpassword is required." }),
  })
  .refine((data) => data.password === data.cpassword, {
    error: "Passwords don't match!",
    path: ["cpassword"],
  });

const loginSchema = z.object({
  email: z.string({ error: "email is required." }).trim().email("Please provide a valid email address."),
  password: z.string({ error: "password is required." }).min(1, "password is required."),
});

const emailVerificationSchema = z.object({
  email: z.string({ error: "email is required." }).trim().email("Please provide a valid email address."),
});

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const TWO_MINUTES_IN_MS = 2 * 60 * 1000;
const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;




async function register(req, res) {
  const { first_name, last_name, email, password, cpassword } = req.body || {};

  const unexpectedFields = allowedFields(req, ["first_name", "last_name", "email", "password", "cpassword"]);

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Only first_name, last_name, email, password, and cpassword are allowed.",
      errors: unexpectedFields.map((field) => ({
        path: [field],
        message: "This field is not allowed.",
      })),
    });
  }

  try {
    const parsedUser = registerSchema.safeParse({ first_name, last_name, email, password, cpassword });

    if (!parsedUser.success) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: parsedUser.error.issues,
      });
    }

    const validatedUser = parsedUser.data;
    const existingUser = await User.findOne({ where: { email: validatedUser.email } });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(validatedUser.password, 10);

    const user = await User.create({
      firstName: validatedUser.first_name,
      lastName: validatedUser.last_name,
      email: validatedUser.email,
      passwordHash: hashedPassword,
      status: "inactive",
    });

    await PasswordHistory.create({
      userId: user.id,
      passwordHash: hashedPassword,
    });

    

    const {rawToken} = await refreshEmailVerificationToken(user.id, TWO_MINUTES_IN_MS) // For creating token for email verification

    // return res.send(rawToken);

    await sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      token: rawToken,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        status: false,
        message: "Database validation failed.",
        errors: error.errors.map(({ path, message }) => ({ path: [path], message })),
      });
    }

    return res.status(500).json({
      status: false,
      message: "Unable to register user.",
    });
  }
}

async function verifyEmail(req, res) {
  const { token } = req.query;

  if (typeof token !== "string" || !token) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification link.",
    });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const verificationToken = await EmailVerificationToken.findOne({ where: { tokenHash } });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification link.",
      });
    }

    if (verificationToken.expiresAt <= new Date()) {
      await verificationToken.destroy();
      return res.status(400).json({
        success: false,
        message: "Verification link has expired.",
      });
    }

    const user = await verificationToken.getUser();

    if (!user) {
      await verificationToken.destroy();
      return res.status(400).json({
        success: false,
        message: "Invalid verification link.",
      });
    }

    await user.update({
      status: "active",
      emailVerifiedAt: new Date(),
    });
    await verificationToken.destroy();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify email.",
    });
  }
}

async function login(req, res) {
  const parsedLogin = loginSchema.safeParse(req.body);

  if (!parsedLogin.success) {
    return res.status(400).json({
      status: false,
      message: "Validation failed.",
      errors: parsedLogin.error.issues,
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured.");
    return res.status(500).json({ status: false, message: "Unable to log in." });
  }

  try {
    const { email, password } = parsedLogin.data;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        status: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        type: "inactive",
        status: false,
        message: "Please verify your email before logging in."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        status: false,
        message: "This account is not available for login.",
      });
    }

    const authenticatedUser = {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
    };
    const token = jwt.sign(authenticatedUser, process.env.JWT_SECRET, { expiresIn: "1d" });



    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ONE_DAY_IN_MS,
    });

    // console.log(user);
    // user.last_login_at = new Date();
    await user.update({
      lastLoginAt: new Date(),
    });

    return res.status(200).json({
      status: true,
      message: "Login successful.",
      user: authenticatedUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ status: false, message: "Unable to log in." });
  }
}

function loggedInUsr(req, res) {
  return res.status(200).json({
    status: true,
    message: "Authenticated user information.",
    user: req.user,
  });
}

function logout(req, res) {
  try {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      status: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      status: false,
      message: "Unable to log out.",
    });
  }
}

async function resendVerificationEmail(req, res){

  const { email } = req.body;

  try{
    const parsedEmail = emailVerificationSchema.safeParse({email});
  
    if (!parsedEmail.success) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: parsedEmail.error.issues,
      });
    }
  
    const user = await User.findOne({where: {email}});

    if(!user){
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    }

    // return res.send(user);
    const {id, status, emailVerifiedAt, firstName} = user;

    if(status === "active"){
      return res.status(409).json({
        status: false,
        message: "Email is already verified."
      });
    }

    const {rawToken} = await refreshEmailVerificationToken(id, TWO_MINUTES_IN_MS) // For creating token for email verification

    await sendVerificationEmail({
      email,
      firstName,
      token: rawToken,
    });

    return res.status(201).json({
      success: true,
      message: "Email verification link sent succesfully",
    });
  }catch(error){
    console.error("Some Error Occured: "+ error);
    return res.status(500).json({
      status: false,
      message: "Unable to resend verification email.",
    });
  }



}

async function forgotPassword(req, res) {
  const { email } = req.body || {};

  try {
    const parsedEmail = emailVerificationSchema.safeParse({ email });

    if (!parsedEmail.success) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: parsedEmail.error.issues,
      });
    }
    const validatedEmail = parsedEmail.data;

    // await requestPasswordReset(parsedEmail.data.email);
    const user = await User.findOne({ where: { email: validatedEmail.email } });
    
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }
  
    const { rawToken } = await refreshPasswordResetToken(user.id, FIFTEEN_MINUTES_IN_MS);
  
    await sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      token: rawToken,
    });

    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({
      status: false,
      message: "Unable to process password reset request.",
    });
  }
}

async function resetPassword(req, res) {
  const { token, password, cpassword } = req.body || {};
  const unexpectedFields = allowedFields(req, ["token", "password", "cpassword"]);

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Only token, password, and cpassword are allowed.",
      errors: unexpectedFields.map((field) => ({
        path: [field],
        message: "This field is not allowed.",
      })),
    });
  }

  try {
    const parsedResetPassword = resetPasswordSchema.safeParse({ token, password, cpassword });

    if (!parsedResetPassword.success) {
      return res.status(400).json({
        status: false,
        message: "Validation failed.",
        errors: parsedResetPassword.error.issues,
      });
    }

    const validatedResetPassword = parsedResetPassword.data;
    const tokenHash = crypto.createHash("sha256").update(validatedResetPassword.token).digest("hex");
    const passwordResetToken = await PasswordResetToken.findOne({ where: { tokenHash } });

    if (!passwordResetToken) {
      return res.status(404).json({
        status: false,
        message: "Invalid Token",
      });
    }

    if (passwordResetToken.expiresAt <= new Date()) {
      await passwordResetToken.destroy();
      return res.status(400).json({
        status: false,
        message: "Token has expired already. Please regenerate a new token",
      });
    }

    const user = await passwordResetToken.getUser();

    if (!user) {
      await passwordResetToken.destroy();
      return res.status(404).json({
        status: false,
        message: "Something went wrong",
      });
    }

    const passwordHistoryEntries = await user.getPasswordHistories({
      order: [["createdAt", "ASC"]],
    });

    if (passwordHistoryEntries.length >= 5) {
      const oldestPasswordHistory = passwordHistoryEntries[0];
      await oldestPasswordHistory.destroy();
    }


    const histories = await user.getPasswordHistories({ order: [["createdAt", "ASC"]] });

    const isPasswordUsedBefore = await Promise.all(
      histories.map(async (entry) => {
        return bcrypt.compare(validatedResetPassword.password, entry.passwordHash);
      })
    );


    if (isPasswordUsedBefore.some(Boolean)) {
      return res.status(400).json({
        status: false,
        message: "You have used this password before. Please use different password",
      });
    }

    const hashedPassword = await bcrypt.hash(validatedResetPassword.password, 10);

    await PasswordHistory.create({
      userId: user.id,
      passwordHash: hashedPassword,
    });

    await user.update({
      passwordHash: hashedPassword,
      lastPasswordResetAt: new Date(),
    });
    await passwordResetToken.destroy();

    await sendPasswordResetConfirmationEmail({
      email: user.email,
      firstName: user.firstName,
    });

    return res.status(200).json({
      status: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({
      status: false,
      message: "Unable to reset password.",
    });
  }
}

module.exports = { register, login, loggedInUsr, logout, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword };
