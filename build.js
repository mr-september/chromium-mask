import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// Packages src/ into dist/. Pass --simple for an unversioned filename (used by CI smoke tests).
const isSimple = process.argv.includes("--simple");
const { version } = JSON.parse(fs.readFileSync("package.json", "utf8"));
const outputName = isSimple ? "chromium-mask.zip" : `chromium-mask-v${version}.zip`;
const outputPath = path.resolve("dist", outputName);

/** Archivers to try in order: Info-ZIP (Linux/macOS/Git Bash), then bsdtar (built into Windows 10+). */
const archivers = [
  { command: "zip", args: ["-r", "-q", outputPath, "."] },
  { command: "tar", args: ["-a", "-c", "-f", outputPath, "."] },
];

fs.mkdirSync("dist", { recursive: true });
fs.rmSync(outputPath, { force: true });

for (const { command, args } of archivers) {
  try {
    execFileSync(command, args, { cwd: "src", stdio: "inherit" });
    console.log(`Built ${outputName} using ${command}`);
    process.exit(0);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Build failed: ${command} exited with an error`);
      process.exit(1);
    }
  }
}

console.error("Build failed: neither `zip` nor `tar` is available on PATH");
process.exit(1);
