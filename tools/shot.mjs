// Take a screenshot of the dashboard at a size and a frame that can be named.
//
//   node tools/shot.mjs <width> <height> <url> <out.png> [--wait ms]
//
// The dashboard is served by vite (`npm run dev`, or `npm run preview` for a build) and this drives a
// Chrome that already has the debugging protocol open:
//
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
//     --remote-debugging-port=9222 --user-data-dir=/tmp/delta-demo about:blank
//
// A browser window takes a picture of whatever it happens to be looking at. This takes the same
// picture at a viewport and a frame named on the command line, which is what a deck needs, and it
// prints what it measured, so a picture that is wrong is a picture whose numbers say why.

const [width, height, url, out] = process.argv.slice(2);
if (!width || !height || !url || !out) {
  console.error('usage: shot.mjs <width> <height> <url> <out.png> [--wait ms]');
  process.exit(1);
}
const waitAt = process.argv.indexOf('--wait');
const settle = waitAt === -1 ? 900 : Number(process.argv[waitAt + 1] ?? 900);

const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const targets = await (await fetch(`${CDP}/json/list`)).json();
const page = targets.find((target) => target.type === 'page');
if (!page) {
  console.error(`no page target at ${CDP}`);
  process.exit(1);
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve));

let next = 0;
const pending = new Map();
const events = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result ?? {});
    pending.delete(message.id);
  } else if (message.method && events.has(message.method)) {
    events.get(message.method)();
    events.delete(message.method);
  }
});

const call = (method, params = {}) =>
  new Promise((resolve) => {
    const id = (next += 1);
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
const once = (method) => new Promise((resolve) => events.set(method, resolve));

/// What is reported with the picture: the viewport, whether the document overflows it, where each
/// region sits, and what the newest record is. Those are the ways a screenshot of this page goes
/// wrong, and each is a number rather than an opinion.
const MEASURE = `JSON.stringify((() => {
  const box = (node) => {
    const r = node.getBoundingClientRect();
    return [Math.round(r.top), Math.round(r.left), Math.round(r.width), Math.round(r.height)];
  };
  const regions = {};
  for (const node of document.querySelectorAll('[data-region]')) regions[node.dataset.region] = box(node);
  const rows = document.querySelectorAll('[data-region="stream"] li');
  return {
    inner: [innerWidth, innerHeight],
    document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    overflow: [document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight],
    regions,
    rows: rows.length,
    newest: rows[rows.length - 1]?.textContent ?? null,
    scene: document.querySelector('[data-region="scene"]')?.textContent ?? null,
  };
})())`;

await call('Page.enable');
await call('Emulation.setDeviceMetricsOverride', {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 2,
  mobile: Number(width) < 768,
});
const loaded = once('Page.loadEventFired');
await call('Page.navigate', { url });
await loaded;
// The page reads its board over the network and the stream delivers on a clock, so the picture is
// taken after both rather than when the document says it is done.
await new Promise((resolve) => setTimeout(resolve, settle));

const measured = await call('Runtime.evaluate', { expression: MEASURE, returnByValue: true });
console.log(JSON.stringify(JSON.parse(measured.result.value), null, 2));

const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
const { writeFileSync } = await import('node:fs');
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(`wrote ${out}`);
socket.close();
