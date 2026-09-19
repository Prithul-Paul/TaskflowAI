const authModels = require("./auth");
const organizationModels = require("./organization");
const projectModels = require("./project");

module.exports = {
  ...authModels,
  ...organizationModels,
  ...projectModels,
};
