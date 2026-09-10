const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "www");
const entries = [
  "index.html",
  "styles.css",
  "app.js",
  "home-widget.js",
  "local-notifications.js",
  "manifest.webmanifest",
  "service-worker.js",
  "assets",
  "vendor"
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  const target = path.join(output, entry);
  fs.cpSync(source, target, { recursive: true });
}

console.log(`Web assets prepared in ${output}`);
