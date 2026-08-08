const crypto = require("crypto");
const { PasswordResetToken } = require("../../models/auth");

async function refreshPasswordResetToken(userId, expiry) {
  await PasswordResetToken.destroy({ where: { userId } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await PasswordResetToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + expiry),
  });

  return { rawToken };
}

module.exports = refreshPasswordResetToken;
