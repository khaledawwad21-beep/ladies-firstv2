'use strict';
// Unit/integration tests may call their local HTTP servers, never paid services.
const originalFetch = globalThis.fetch;
let blocked = false;
globalThis.fetch = function(input, options) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    blocked = true;
    throw new Error('External fetch blocked in tests; inject fetchImpl instead (' + url.hostname + ')');
  }
  return originalFetch(input, options);
};
process.on('beforeExit', () => { if (blocked) process.exitCode = 1; });
