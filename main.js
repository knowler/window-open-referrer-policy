import { Hono } from "hono";

const REFERRER_POLICIES = new Set([
  "no-referrer",
  "no-referrer-when-downgrade",
  "origin",
  "origin-when-cross-origin",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin", // default
  "unsafe-url",
]);

const [cert, key] = await Promise.all([
  Deno.readTextFile("./0.0.0.0.pem"),
  Deno.readTextFile("./0.0.0.0-key.pem"),
]);

const originA = new Hono();

originA.get("/", c => {
  return c.html(`
    <!doctype html>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>Origin A: Index</title>
    <h1>Origin A: Index</h1>
    <dl><dt>Referer</dt> <dd>${c.req.header("referer") ?? "not set"}</dd></dl>
    <form>
      <label>Referrer Policy
        <select name="referrerPolicy">
          ${option("no-referrer")}
          ${option("no-referrer-when-downgrade")}
          ${option("origin")}
          ${option("origin-when-cross-origin")}
          ${option("same-origin")}
          ${option("strict-origin")}
          ${option("strict-origin-when-cross-origin", null, true)}
          ${option("unsafe-url")}
        </select>
      </label>
      <button formaction="/downgrade">Downgrade</button>
      <button formaction="/same-origin">Same Origin</button>
      <button formaction="/cross-origin">Cross Origin</button>
    </form>
  `);
});

originA.get("/same-origin", c => {
  const referrerPolicy = c.req.query("referrerPolicy");

  return c.html(`
    <!doctype html>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    ${REFERRER_POLICIES.has(referrerPolicy) ? `<meta name="referrer" content="${referrerPolicy}">` : ""}
    <title>Origin A: Same Origin</title>
    <h1>Origin A: Same Origin</h1>
    <p>You should redirect to the same origin in one second…</p>
    <script>
      setTimeout(() => {
        window.open("https://0.0.0.0:4020", "_self");
      }, 1_000);
    </script>
  `);
});

originA.get("/cross-origin", c => {
  const referrerPolicy = c.req.query("referrerPolicy");

  return c.html(`
    <!doctype html>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    ${REFERRER_POLICIES.has(referrerPolicy) ? `<meta name="referrer" content="${referrerPolicy}">` : ""}
    <title>Origin A: Cross Origin</title>
    <h1>Origin A: Cross Origin</h1>
    <p>You should redirect to a different origin in one second…</p>
    <script>
      setTimeout(() => {
        window.open("https://0.0.0.0:4021", "_self");
      }, 1_000);
    </script>
  `);
});

originA.get("/downgrade", c => {
  const referrerPolicy = c.req.query("referrerPolicy");

  return c.html(`
    <!doctype html>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    ${REFERRER_POLICIES.has(referrerPolicy) ? `<meta name="referrer" content="${referrerPolicy}">` : ""}
    <title>Origin A: Downgrade</title>
    <h1>Origin A: Downgrade</h1>
    <p>You should redirect to a downgraded origin in one second…</p>
    <script>
      setTimeout(() => {
        window.open("http://0.0.0.0:4022", "_self");
      }, 1_000);
    </script>
  `);
});

Deno.serve({ port: 4020, cert, key }, originA.fetch);

const originB = new Hono();

originB.get("/", c => {
  return c.html(`
    <!doctype html>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>Origin B: Index</title>
    <h1>Origin B: Index</h1>
    <dl><dt>Referer</dt> <dd>${c.req.header("referer") ?? "not set"}</dd></dl>
    <a href="https://0.0.0.0:4020">Back to origin A</a>
  `);
});

Deno.serve({ port: 4021, cert, key }, originB.fetch);

// Downgraded origin
const originC = new Hono();

originC.get("/", c => {
  return c.html(`
    <!doctype html>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>Origin C: Index</title>
    <h1>Origin C: Index</h1>
    <dl><dt>Referer</dt> <dd>${c.req.header("referer") ?? "not set"}</dd></dl>
    <a href="https://0.0.0.0:4020">Back to origin A</a>
  `);
});

Deno.serve({ port: 4022 }, originC.fetch);

function option(value, current, isDefault = false) {
  return `<option${(!current && isDefault) || value === current ? " selected" : ""}>${value}`;
}
