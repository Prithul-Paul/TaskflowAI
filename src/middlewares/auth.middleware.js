const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const token = req.cookies?.auth_token;

  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ status: false, message: "Unauthorized." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ status: false, message: "Unauthorized." });
  }
}

module.exports = authenticate;
