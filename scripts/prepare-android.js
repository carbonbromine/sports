const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "native", "android");
const target = path.join(root, "android");

if (!fs.existsSync(target)) {
  throw new Error("Android project is missing. Run `npx cap add android` first.");
}

fs.rmSync(
  path.join(target, "app", "src", "main", "java", "com", "carbonbromine", "sports", "widget"),
  { recursive: true, force: true }
);

for (const staleFile of [
  "app/src/main/res/layout/widget_health_summary.xml",
  "app/src/main/res/xml/health_summary_widget_info.xml",
  "app/src/main/res/values/widget_colors.xml",
  "app/src/main/res/values/widget_strings.xml",
  "app/src/main/res/drawable/widget_background.xml",
  "app/src/main/res/drawable/widget_metric_background.xml",
  "app/src/main/res/drawable/widget_source_badge.xml"
]) {
  fs.rmSync(path.join(target, staleFile), { force: true });
}

fs.cpSync(source, target, { recursive: true });
console.log("Android plan widget sources applied.");
