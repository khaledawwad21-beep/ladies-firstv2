"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  cleanCredentialId,
  safeTransports,
  browserRegistrationResponse,
  browserAuthenticationResponse
} = require("../src/passkeys");

const server = fs.readFileSync(
  path.join(__dirname, "../src/server.js"),
  "utf8"
);
const app = fs.readFileSync(
  path.join(__dirname, "../../frontend/app.js"),
  "utf8"
);
const admin = fs.readFileSync(
  path.join(__dirname, "../../frontend/admin.js"),
  "utf8"
);
const browser = fs.readFileSync(
  path.join(__dirname, "../../frontend/passkeys.js"),
  "utf8"
);

test("passkey ids and transports are normalized safely", () => {
  const id = Buffer.from("credential-123").toString("base64url");
  assert.equal(cleanCredentialId(id), id);
  assert.deepEqual(
    safeTransports(["internal", "hybrid", "bad", "internal"]),
    ["internal", "hybrid"]
  );
  assert.throws(() => cleanCredentialId("not valid +"));
});

test("standard WebAuthn responses are shaped for server verification", () => {
  const id = Buffer.from("cred").toString("base64url");
  const registration = browserRegistrationResponse({
    id,
    rawId: id,
    type: "public-key",
    authenticatorAttachment: "platform",
    clientExtensionResults: {},
    response: {
      clientDataJSON: "abc",
      attestationObject: "def",
      transports: ["internal"]
    }
  });
  assert.equal(registration.response.attestationObject, "def");
  assert.deepEqual(registration.response.transports, ["internal"]);

  const authentication = browserAuthenticationResponse({
    id,
    rawId: id,
    response: {
      clientDataJSON: "a",
      authenticatorData: "b",
      signature: "c",
      userHandle: ""
    }
  });
  assert.equal(authentication.response.signature, "c");
});

test("server initializes and registers passkey routes", () => {
  assert.match(server, /initPasskeys\(db\)/);
  assert.match(server, /registerPasskeyRoutes\(app/);
  assert.match(server, /require\("\.\/passkeys"\)/);
});

test("passkey backend uses standards-based WebAuthn verification", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/passkeys.js"),
    "utf8"
  );
  assert.match(source, /@simplewebauthn\/server/);
  assert.match(source, /verifyRegistrationResponse/);
  assert.match(source, /verifyAuthenticationResponse/);
  assert.match(source, /requireUserVerification:\s*true/);
  assert.match(source, /authenticatorAttachment:\s*"platform"/);
  assert.match(source, /expires_at > NOW\(\)/);
});

test("customer and admin both expose optional biometric login", () => {
  assert.match(app, /customerPasskeyLogin\(/);
  assert.match(app, /enableCustomerPasskey\(/);
  assert.match(app, /\/api\/passkeys\/login\/options/);
  assert.match(admin, /adminPasskeyLogin\(/);
  assert.match(admin, /enableAdminPasskey\(/);
  assert.match(browser, /navigator\.credentials\.create/);
  assert.match(browser, /navigator\.credentials\.get/);
  assert.match(browser, /attestationObject/);
});
