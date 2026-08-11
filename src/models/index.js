const authModels = require("./auth");
const organizationModels = require("./organization");

module.exports = {
  ...authModels,
  ...organizationModels,
};
