// Creates a stub for lucide-react's chrome icon if Windows Defender removed it
import fs from "fs";
import path from "path";

const root = process.cwd();
const chromeIconPath = path.join(
  root,
  "node_modules",
  "lucide-react",
  "dist",
  "esm",
  "icons",
  "chrome.js",
);

try {
  if (!fs.existsSync(chromeIconPath)) {
    const dir = path.dirname(chromeIconPath);
    fs.mkdirSync(dir, { recursive: true });
    const stub = [
      'import React from "react";',
      'const Chrome = React.forwardRef(function Chrome(props, ref) { return React.createElement("svg", { ref, ...props }); });',
      'Chrome.displayName = "Chrome";',
      "export default Chrome;",
      "export const ChromeIcon = Chrome;",
      "export const LucideChrome = Chrome;",
      "",
    ].join("\n");
    fs.writeFileSync(chromeIconPath, stub, "utf8");
    console.log("[fix-lucide] Created stub for lucide-react chrome icon");
  } else {
    console.log(
      "[fix-lucide] lucide-react chrome icon present, no action needed",
    );
  }
} catch (err) {
  console.error("[fix-lucide] Failed to create stub icon:", err);
  process.exit(0);
}
