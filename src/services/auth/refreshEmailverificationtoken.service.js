const crypto = require("crypto");
const { EmailVerificationToken } = require("../../models/auth");

async function refreshEmailVerificationToken(userId, expiry){
    await EmailVerificationToken.destroy({ where: { userId } });
    
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    
    await EmailVerificationToken.create({
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + expiry),
    });

    return {rawToken};

}

module.exports = refreshEmailVerificationToken;
