function allowedFields(req, fields) {
  // const allowedFields = ["first_name", "last_name", "email", "password", "cpassword"];
  const unexpectedFields = Object.keys(req.body || {}).filter(
    (field) => !fields.includes(field)
  );

  return unexpectedFields;
}

module.exports = allowedFields;