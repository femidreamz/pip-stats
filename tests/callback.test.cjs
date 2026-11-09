const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "callback.html"), "utf8");
const script = fs.readFileSync(path.join(root, "callback.js"), "utf8");
const clean = "https://example.invalid/pip-stats/callback.html";

function openReturn(suffix, blockHistory = false) {
  const heading = { textContent: "" };
  const message = { textContent: "" };
  const replacements = [];
  const navigations = [];
  const window = {
    location: { href: clean + suffix, replace: url => navigations.push(url) },
    history: {
      replaceState(state, title, url) {
        if (blockHistory) throw new Error("History unavailable");
        assert.equal(state, null);
        replacements.push(url);
      },
    },
  };
  const document = { getElementById: id => ({ heading, message })[id] };
  vm.runInNewContext(script, { URL, window, document });
  return { heading: heading.textContent, message: message.textContent, replacements, navigations };
}

test("HTML defaults to unconfirmed with JavaScript disabled or unavailable", () => {
  assert.match(html, /id="heading">TikTok sign-in</);
  assert.match(html, /id="message">This page cannot confirm a connection/);
  assert.doesNotMatch(html, /TikTok connected/i);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<script defer src="callback\.js"><\/script>/);
  assert.match(html, /href="index\.html"/);
});

const invalid = "Sign-in link is incomplete or invalid";
const cases = [
  ["direct visit", "", "No sign-in response"],
  ["code and state", "?code=private-fixture-A&state=private-fixture-B", "Sign-in response received"],
  ["scopes granted", "?state=private-fixture-B&scopes=video.list&code=private-fixture-A", "Sign-in response received"],
  ["user denied access", "?error=access_denied&error_description=private-fixture-message", "Permission declined"],
  ["unknown provider error", "?error=private-fixture-error&state=private-fixture-B", "TikTok sign-in did not finish"],
  ["provider text only", "?error_description=%3Cscript%3Eprivate-fixture%3C%2Fscript%3E", "TikTok sign-in did not finish"],
  ["missing code", "?state=private-fixture-B", invalid],
  ["missing state", "?code=private-fixture-A", invalid],
  ["blank code", "?code=%20&state=private-fixture-B", invalid],
  ["blank state", "?code=private-fixture-A&state=", invalid],
  ["conflicting error and code", "?error=access_denied&state=B&code=A", invalid],
  ["duplicate code", "?code=A&code=A&state=B", invalid],
  ["duplicate state", "?state=B&code=A&state=C", invalid],
  ["duplicate error", "?error=access_denied&error=other", invalid],
  ["forged success", "?connected=true", invalid],
  ["token mixed with code", "?code=A&state=B&refresh_token=private-fixture-token", invalid],
  ["fragment credentials", "#access_token=private-fixture-token", invalid],
  ["valid query with fragment", "?code=A&state=B#connected", invalid],
];

for (const [name, suffix, expected] of cases) {
  test(name, () => {
    const result = openReturn(suffix);
    assert.equal(result.heading, expected);
    assert.match(result.message, /private Pip Stats dashboard/);
    assert.doesNotMatch(result.heading + result.message, /private-fixture|<script>|TikTok connected/i);
    assert.deepEqual(result.replacements, suffix ? [clean] : []);
    assert.deepEqual(result.navigations, []);
  });
}

test("blocked history update navigates to the same path without the return values", () => {
  const result = openReturn("?code=private-fixture-A&state=private-fixture-B", true);
  assert.deepEqual(result.navigations, [clean]);
  assert.deepEqual(result.replacements, []);
  assert.equal(result.heading, "");
});
