import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function build() {
  // Check if --simple flag is passed
  const isSimple = process.argv.includes("--simple");

  // Read package.json to get version
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const version = packageJson.version;

  // Determine output filename
  const outputFilename = isSimple ? "chromium-mask.zip" : `chromium-mask-v${version}.zip`;

  const outputPath = path.join("dist", outputFilename);

  // Files to exclude from production build
  const excludeFiles = [
    "dev-localhost-setup.js",
    "assets/Untitled-1.png",
    "assets/Untitled-1.psd",
    "assets/linux-icon.png",
  ];

  console.log(`Building ${outputFilename}...`);
  console.log(`Excluding development files: ${excludeFiles.join(", ")}`);

  try {
    // Change to src directory
    process.chdir("src");

    // Try to use native zip command first (available on Unix and newer Windows)
    try {
      // Build exclude pattern for zip command
      const excludePattern = excludeFiles.map((f) => `-x "${f}"`).join(" ");
      execSync(`zip -r "../${outputPath}" . ${excludePattern}`, { stdio: "inherit" });
      console.log(`✓ Successfully created ${outputFilename} using zip command`);
      return;
    } catch (error) {
      // If zip command fails, try PowerShell Compress-Archive (Windows)
      try {
        // PowerShell exclude is more complex - need to filter files first
        const excludePatterns = excludeFiles.map((f) => `"${f}"`).join(",");
        const psCommand = `powershell -Command "Get-ChildItem -Recurse | Where-Object { $exclude = @(${excludePatterns}); $match = $false; foreach($pattern in $exclude) { if($_.FullName -like '*' + $pattern) { $match = $true; break } }; -not $match } | Compress-Archive -DestinationPath '../${outputPath}' -Force"`;
        execSync(psCommand, { stdio: "inherit" });
        console.log(`✓ Successfully created ${outputFilename} using PowerShell`);
        return;
      } catch (psError) {
        // If both fail, fall back to Node.js archiver (requires installation)
        console.log("Neither zip nor PowerShell available, falling back to Node.js solution...");
        console.log("Installing archiver package...");

        // Go back to root directory for npm install
        process.chdir("..");
        execSync("npm install archiver --save-dev", { stdio: "inherit" });

        // Use archiver to create zip
        const { default: archiver } = await import("archiver");
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
          console.log(`✓ Successfully created ${outputFilename} using Node.js archiver (${archive.pointer()} bytes)`);
        });

        archive.on("error", (err) => {
          throw err;
        });

        archive.pipe(output);

        // Add files while excluding development files
        const isExcluded = (filePath) => {
          return excludeFiles.some((pattern) => filePath.includes(pattern));
        };

        archive.glob("**/*", {
          cwd: "src/",
          ignore: excludeFiles,
        });

        await archive.finalize();
        return;
      }
    }
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  } finally {
    // Ensure we're back in the root directory
    try {
      process.chdir("..");
    } catch (e) {
      // Already in root or error occurred
    }
  }
}

// Run the build function
build().catch((error) => {
  console.error("Build failed:", error.message);
  process.exit(1);
});
