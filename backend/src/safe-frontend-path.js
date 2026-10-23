"use strict";

const path = require("node:path");

function resolveFrontendPath(frontendRoot, requestPath) {
  if (typeof requestPath !== "string" || !requestPath.startsWith("/")) {
    return null;
  }

  const root = path.resolve(frontendRoot);
  const target = path.resolve(root, `.${requestPath}`);
  const relative = path.relative(root, target);

  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return null;
  }

  return target;
}

module.exports = { resolveFrontendPath };
