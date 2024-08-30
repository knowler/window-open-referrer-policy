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
// Cross origin
const originB = new Hono();
// Downgraded origin
const originC = new Hono();

originA.get("/", c => html("Origin A: Index", `
  ${referrerDl(c)}
  <form>
    <label>Referrer Policy
      <select name="referrerPolicy">
        <option>no-referrer
        <option>no-referrer-when-downgrade
        <option>origin
        <option>origin-when-cross-origin
        <option>same-origin
        <option>strict-origin
        <option selected>strict-origin-when-cross-origin
        <option>unsafe-url
      </select>
    </label>
    <button formaction="/same-origin">Same Origin</button>
    <button formaction="/cross-origin">Cross Origin</button>
    <button formaction="/downgrade">Downgrade</button>
  </form>
`));

originA.get("/same-origin", c => html("Origin A: Same Origin", `
  ${referrerMeta(c)}
  <p>You should redirect to the same origin in one second…</p>
  ${scriptOpen("https://0.0.0.0:4020")}
`));

originA.get("/cross-origin", c => html("Origin A: Cross Origin", `
  ${referrerMeta(c)}
  <p>You should redirect to a different origin in one second…</p>
  ${scriptOpen("https://0.0.0.0:4021")}
`));

originA.get("/downgrade", c => html("Origin A: Downgrade", `
  ${referrerMeta(c)}
  <p>You should redirect to a downgraded origin in one second…</p>
  ${scriptOpen("http://0.0.0.0:4022")}
`));

originB.get("/", c => html("Origin B: Index", `${referrerDl(c)}<a href="https://0.0.0.0:4020">Back to origin A</a>`));
originC.get("/", c => html("Origin C: Index", `${referrerDl(c)}<a href="https://0.0.0.0:4020">Back to origin A</a>`));

Deno.serve({ port: 4020, cert, key }, originA.fetch);
Deno.serve({ port: 4021, cert, key }, originB.fetch);
Deno.serve({ port: 4022 }, originC.fetch);

function html(title, content) {
  const body = `
    <!doctype html>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>${title}</title>
    <h1>${title}</h1>
    ${content}
  `;

  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

function scriptOpen(url) {
  return `<script>setTimeout(() => window.open("${url}", "_self"), 1_000);</script>`;
}

function referrerDl(c) {
  return `<dl><dt>Referer</dt> <dd>${c.req.header("referer") ?? "not set"}</dd></dl>`;
}

function referrerMeta(c) {
  const referrerPolicy = c.req.query("referrerPolicy");
  return REFERRER_POLICIES.has(referrerPolicy) ? `<meta name="referrer" content="${referrerPolicy}">` : "";
}
