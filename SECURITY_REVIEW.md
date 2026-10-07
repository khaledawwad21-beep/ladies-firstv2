# Security review — 7 October 2026

Scope: application source, production gateway, customer/admin APIs, sessions and roles, public responses, catalog rendering, media input, isolated HTTP/database tests, dependency audit, container build configuration, and a read-only live health/header check. Baseline reviewed: `0856dab`; changes reconciled with `e08b5b7` (including guest checkout, updated discount math, staff permissions, image compression and waitlist tests).

This is an application security review, not a certification that the site has no vulnerabilities. Live customer records were not modified, paid integrations were not invoked, and no attack traffic was sent to production.

## Confirmed findings addressed in this branch

| Finding | Impact | Remediation |
|---|---|---|
| JWT roles remained authoritative after role changes/account disabling | High: obsolete administrative access | Every authenticated request checks the current active account and role in the database |
| User-management staff could change administrator login details/passwords | High: privilege escalation | Only owner can manage privileged targets; existing owner protection retained |
| Password changes and logout did not revoke issued JWTs | High: compromised sessions remain usable | Database session version, password-change trigger, authenticated logout and frontend wiring |
| Staff could reach paid Tripo operations outside granular admin routing | High: unauthorized integration usage | Restricted to active owner/admin accounts |
| Dynamic strings used unsafe JavaScript/HTML attribute contexts | High: stored script injection through catalog inputs | JSON-encoded event arguments plus HTML escaping, safe media URLs, rejection of unsafe image sources, and executable regression probes |
| Public settings returned arbitrary stored settings | Medium: potentially private integration data disclosed | Explicit public setting allowlist; synthetic secret tested, no real secret values read |
| Public catalog/customer responses included internal purchase costs | Medium: internal business data disclosed | Remove cost fields recursively from public/customer responses; admin reporting and the authenticated product editor retain costs |
| Arbitrary origins were allowed with credentials; browser defenses absent | Medium: cross-origin abuse exposure | Same-origin/explicit allowlist, bearer-only authentication, framing/MIME/referrer/CSP baseline headers |
| Authentication and guest-write endpoints lacked general request throttling | Medium: brute force/resource abuse | Bounded process-local per-IP/per-route limits and Retry-After |
| First-owner provisioning was public when no owner existed | High for a fresh deployment | Production setup requires private BOOTSTRAP_TOKEN of at least 32 characters |

Also fixed a pre-existing missing closing brace in `whatsappOrderUrl`, and added syntax validation of every shipped JavaScript bundle. Build dependencies are locked; CI/container installs use npm ci; the container runs as the node user; build/git ignore files exclude environment files and dependency directories.

## Verification

- Initial isolated security probes: 8 failures reproduced out of 9 cases before remediation.
- Final local full suite: 227 tests, 220 passed, 7 gated real-PostgreSQL E2E tests skipped locally. PGlite tests execute PostgreSQL SQL in-process; they do not replace the real PostgreSQL CI jobs.
- Includes 20 dedicated security tests across HTTP, rendered event handlers and JavaScript syntax.
- Tested account disable/demotion, privilege boundaries, password/session revocation, logout, forged JWTs, cross-customer order access/returns, server-side prices, cookie-only rejection, SQL-injection-shaped input, restricted Tripo access, settings/cost privacy, media validation, rate limits, production setup lock and browser headers.
- npm audit on the resolved dependency tree: 0 known advisories reported. This does not cover unknown vulnerabilities or external frontend CDN assets.
- Pattern scan of 47 tracked runtime/config/frontend files found no matching common private-key, GitHub-token, OpenAI-key or AWS-key patterns. This was not an exhaustive historical secret audit.
- Read-only live health check returned HTTP 200 on `045a6e5` before deployment; the new browser headers were absent on that live baseline.

## Deployment and remaining limits

Changes require review/merge and successful CI/Render deployment before they protect the live site. Do not treat branch-only fixes as live fixes.

- Production infrastructure/account access was not available: Render permissions, environment-secret quality, database TLS certificate configuration (`rejectUnauthorized: false` remains in existing DB setup), backups/restoration, edge/WAF configuration and account MFA remain unverified.
- Rate limits are process-local: reset on restart and not coordinated across replicas. Use a shared limiter/edge control before scaling or under sustained abuse.
- The frontend still uses localStorage bearer tokens and inline handlers. The CSP here blocks frames/objects/base abuse but does not enforce a strict script-src policy. A broader frontend migration is required for strict CSP and server-managed HttpOnly sessions.
- No real Visa gateway transaction, payment webhook, real refund, WhatsApp/email delivery or WebAuthn device ceremony was exercised. An order's selected payment method must not be treated as verified payment.
- Recovery/contact changes, public waitlist deduplication, concurrent abuse, persistent third-party supply-chain scanning and deployment secret/history scanning warrant further review. This review is not an exhaustive independent penetration test.
- Existing owner setup continues to be closed. For a fresh production database, set BOOTSTRAP_TOKEN privately in Render and enter it in the setup form; remove the value after setup. Never commit it. Configure ALLOWED_ORIGINS only if a separate trusted frontend origin is needed.
- Logout now revokes all sessions for that account. Password updates revoke existing sessions. Customer and admin clients use Authorization bearer headers; legacy cookie-only API clients must migrate.

Reference approach: OWASP Authorization Cheat Sheet and Cross Site Scripting Prevention Cheat Sheet.
