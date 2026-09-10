const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "native", "android");
const target = path.join(root, "android");

if (!fs.existsSync(target)) {
  throw new Error("Android project is missing. Run `npx cap add android` first.");
}

fs.cpSync(source, target, { recursive: true });
console.log("Android widget sources applied.");
