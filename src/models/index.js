const User = require('./User');
const EmailVerificationToken = require('./EmailVerificationToken');

User.hasMany(EmailVerificationToken, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

EmailVerificationToken.belongsTo(User, {
  foreignKey: "userId",
});

module.exports = {
  User,
  EmailVerificationToken,
};
