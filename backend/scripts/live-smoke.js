"use strict";

const assert = require("node:assert/strict");

async function checkLive({ baseUrl, expectedSha, fetchFn = fetch }) {
  assert.match(expectedSha || "", /^[a-f0-9]{40}$/, "Expected a full release commit SHA");
  async function request(endpoint) {
    const res = await fetchFn(baseUrl + endpoint, { signal: AbortSignal.timeout(30000) });
    assert.equal(res.ok, true, `Request failed: ${endpoint} HTTP ${res.status}`);
    return res;
  }
  const health = await (await request("/api/health")).json();
  assert.equal(health.ok, true);
  assert.equal(health.databaseConfigured, true);
  assert.equal(health.database, true);
  assert.equal(health.gitBranch, "main");
  assert.equal(health.gitCommit, expectedSha, "Render release differs from expected commit");
  for (const endpoint of ["/", "/admin.html"]) {
    assert.match(await (await request(endpoint)).text(), /Ladies First/i);
  }
  for (const endpoint of ["/api/products", "/api/settings", "/api/categories", "/api/brands"]) {
    const data = await (await request(endpoint)).json();
    assert.ok(data && typeof data === "object" && !Array.isArray(data), endpoint);
    assert.notEqual(data.ok, false, `API reports failure: ${endpoint}`);
  }
  return health.gitCommit;
}

if (require.main === module) {
  const attempts = Number(process.env.SMOKE_ATTEMPTS || 1);
  (async () => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const sha = await checkLive({
          baseUrl: process.env.BASE_URL || "https://ladies-firstv2.onrender.com",
          expectedSha: process.env.EXPECTED_SHA
        });
        console.log(`Live storefront, admin page and public APIs are responding correctly. Release: ${sha}`);
        return;
      } catch (error) {
        console.error(`Live check ${attempt}/${attempts}: ${error.message}`);
        if (attempt === attempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    }
  })().catch(() => { process.exitCode = 1; });
}

module.exports = { checkLive };
