const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..","..");
const start=fs.readFileSync(path.join(root,"backend","src","start.js"),"utf8");
const workflow=fs.readFileSync(path.join(root,".github","workflows","production-regression.yml"),"utf8");

test("health endpoint exposes the exact Render deploy commit",()=>{
  assert.match(start,/RENDER_GIT_COMMIT/);
  assert.match(start,/gitCommit:/);
  assert.match(start,/RENDER_GIT_BRANCH/);
});

test("main pushes verify the live Render service after regression passes",()=>{
  assert.match(workflow,/live-render-smoke:/);
  assert.match(workflow,/needs: backend-regression/);
  assert.match(workflow,/github\.event_name == 'push'/);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/https:\/\/ladies-firstv2\.onrender\.com\/api\/health/);
  assert.match(workflow,/EXPECTED_SHA:/);
  assert.match(workflow,/gitCommit/);
  assert.match(workflow,/Render is live on expected commit/);
});
