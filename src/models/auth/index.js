const User = require('./User');
const EmailVerificationToken = require('./EmailVerificationToken');
const PasswordResetToken = require('./PasswordResetToken');
const PasswordHistory = require('./PasswordHistory');

User.hasMany(EmailVerificationToken, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

EmailVerificationToken.belongsTo(User, {
  foreignKey: "userId",
});

User.hasMany(PasswordResetToken, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

PasswordResetToken.belongsTo(User, {
  foreignKey: "userId",
});


User.hasMany(PasswordHistory, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

PasswordHistory.belongsTo(User, {
  foreignKey: "userId",
});

module.exports = {
  User,
  EmailVerificationToken,
  PasswordResetToken,
  PasswordHistory
};
