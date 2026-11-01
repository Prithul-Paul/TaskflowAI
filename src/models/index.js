const authModels = require("./auth");
const organizationModels = require("./organization");
const projectModels = require("./project");
const taskModels = require("./task");

module.exports = {
  ...authModels,
  ...organizationModels,
  ...projectModels,
  ...taskModels,
};
