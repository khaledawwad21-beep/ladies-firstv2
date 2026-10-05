"use strict";

const express = require("express");

const MIN_PASSWORD_LENGTH = 12;

function rejectShortPassword(res) {
  return res.status(400).json({
    ok: false,
    code: "PASSWORD_TOO_SHORT",
    message: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} خانة على الأقل`
  });
}

function requirePasswordField(fieldNames) {
  return function passwordPolicy(req, res, next) {
    const body = req.body || {};
    const value = fieldNames
      .map((field) => body[field])
      .find((candidate) => candidate !== undefined && candidate !== null);

    if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
      return rejectShortPassword(res);
    }

    return next();
  };
}

const requireValidPassword = requirePasswordField(["password"]);
const requireValidNewPassword = requirePasswordField(["newPassword", "new_password"]);

function createRequestPolicyRouter() {
  const router = express.Router();

  /* Body parsing happens here because this router is mounted before the legacy app. */
  router.use(express.json({ limit: "5mb" }));
  router.use(express.urlencoded({ extended: true, limit: "5mb" }));

  router.post("/api/auth/register", requireValidPassword);
  router.post("/api/auth/bootstrap-owner", requireValidPassword);
  router.post("/api/admin/staff", requireValidPassword);
  router.patch("/api/admin/users/:id/password", requireValidPassword);
  router.patch("/api/auth/password", requireValidNewPassword);

  return router;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  requireValidPassword,
  requireValidNewPassword,
  createRequestPolicyRouter
};
