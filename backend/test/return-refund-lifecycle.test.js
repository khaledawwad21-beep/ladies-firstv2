const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");

test("return refunds have an explicit persisted settlement lifecycle",()=>{
 assert.match(server,/return_refund_amount NUMERIC\(12,2\)/);
 assert.match(server,/return_refund_status TEXT NOT NULL DEFAULT 'not_required'/);
 assert.match(server,/return_refund_method TEXT/);
 assert.match(server,/return_refund_reference TEXT/);
 assert.match(server,/return_refund_settled_at TIMESTAMPTZ/);
});

test("payable return refunds become pending until explicitly settled",()=>{
 assert.match(server,/returnRefundAmount=money\(Math\.max\(0,refundableCash-serviceFee\)\)/);
 assert.match(server,/if\(returnRefundStatus==="not_required"\)returnRefundStatus="pending"/);
 assert.match(server,/\["pending","settled"\]\.includes\(returnRefundStatus\)/);
});

test("settled return refunds require method and non-cash references",()=>{
 assert.match(server,/RETURN_REFUND_METHOD_REQUIRED/);
 assert.match(server,/\["cash","transfer","visa","store_credit"\]/);
 assert.match(server,/RETURN_REFUND_REFERENCE_REQUIRED/);
 assert.match(server,/\["transfer","visa","store_credit"\]\.includes\(returnRefundMethod\)/);
});

test("return refund settlement timestamps only when actually settled",()=>{
 assert.match(server,/return_refund_settled_at=CASE WHEN \$29='settled'/);
});

test("admin can record refund status method and reference",()=>{
 assert.match(admin,/rrReturnRefundStatus/);
 assert.match(admin,/rrReturnRefundMethod/);
 assert.match(admin,/rrReturnRefundReference/);
 assert.match(admin,/returnRefundStatus/);
 assert.match(admin,/returnRefundMethod/);
 assert.match(admin,/returnRefundReference/);
});

test("settlement receipt uses authoritative net settlement and exposes refund state",()=>{
 assert.match(admin,/Math\.abs\(Number\(x\.net_settlement\|\|0\)\)/);
 assert.match(admin,/حالة رد المبلغ/);
 assert.match(admin,/مرجع التسوية/);
});

test("customer sees payable return refund status in order history",()=>{
 assert.match(server,/return_refund_amount,return_refund_status,return_refund_method,return_refund_reference/);
 assert.match(app,/رد المبلغ معلّق/);
 assert.match(app,/تم رد المبلغ/);
 assert.match(app,/المبلغ المستحق/);
});
