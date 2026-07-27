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
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

async function sendVerificationEmail({ email, firstName, token }) {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const verificationUrl = `${appUrl}/v1/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Verify your Email",
    text: `Hello ${firstName},\n\nPlease click the link below to verify your email.\n\n${verificationUrl}\n\nThis link expires in 24 hours.\n\nRegards,\nTeam`,
  });
}

module.exports = { sendVerificationEmail };
