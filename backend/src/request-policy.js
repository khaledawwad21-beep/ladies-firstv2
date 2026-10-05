"use strict";

const express = require("express");

const MIN_PASSWORD_LENGTH = 12;

function requireValidPassword(req, res, next) {
  const password = req.body && req.body.password;
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      ok: false,
      code: "PASSWORD_TOO_SHORT",
      message: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} خانة على الأقل`
    });
  }
  return next();
}

function createRequestPolicyRouter() {
  const router = express.Router();
  router.use(express.json({ limit: "5mb" }));
  router.use(express.urlencoded({ extended: true, limit: "5mb" }));
  router.post("/api/auth/register", requireValidPassword);
  router.post("/api/auth/bootstrap-owner", requireValidPassword);
  return router;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  requireValidPassword,
  createRequestPolicyRouter
};
