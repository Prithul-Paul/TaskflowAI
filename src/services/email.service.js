const nodemailer = require("nodemailer");

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error("SMTP configuration is incomplete.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

async function sendVerificationEmail({ email, firstName, token }) {
  // const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const verificationUrl = `${process.env.FRONTEND_URL}/verifyemail?token=${encodeURIComponent(token)}`;

  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Verify your Email",
    text: `Hello ${firstName},\n\nPlease click the link below to verify your email.\n\n${verificationUrl}\n\nThis link expires in 24 hours.\n\nRegards,\nTeam`,
  });
}

async function sendPasswordResetEmail({ email, firstName, token }) {
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Reset your Password",
    text: `Hello ${firstName},\n\nPlease click the link below to reset your password.\n\n${resetPasswordUrl}\n\nThis link expires in 15 minutes.\n\nRegards,\nTeam`,
  });
}

async function sendPasswordResetConfirmationEmail({ email, firstName }) {
  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your Password Has Been Reset",
    text: `Hello ${firstName},\n\nYour password was successfully reset.\n\nIf you did not make this change, please contact support immediately.\n\nRegards,\nTeam`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetConfirmationEmail };
