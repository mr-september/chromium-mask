import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function build() {
  // Check if --simple flag is passed
  const isSimple = process.argv.includes('--simple');

  // Read package.json to get version
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = packageJson.version;

  // Determine output filename
  const outputFilename = isSimple 
    ? 'chrome-mask-for-opera.zip'
    : `chrome-mask-for-opera-v${version}.zip`;

  const outputPath = path.join('dist', outputFilename);

  console.log(`Building ${outputFilename}...`);

  try {
    // Change to src directory
    process.chdir('src');
    
    // Try to use native zip command first (available on Unix and newer Windows)
    try {
      execSync(`zip -r "../${outputPath}" .`, { stdio: 'inherit' });
      console.log(`✓ Successfully created ${outputFilename} using zip command`);
      return;
    } catch (error) {
      // If zip command fails, try PowerShell Compress-Archive (Windows)
      try {
        execSync(`powershell -Command "Compress-Archive -Path * -DestinationPath '../${outputPath}' -Force"`, { stdio: 'inherit' });
        console.log(`✓ Successfully created ${outputFilename} using PowerShell`);
        return;
      } catch (psError) {
        // If both fail, fall back to Node.js archiver (requires installation)
        console.log('Neither zip nor PowerShell available, falling back to Node.js solution...');
        console.log('Installing archiver package...');
        
        // Go back to root directory for npm install
        process.chdir('..');
        execSync('npm install archiver --save-dev', { stdio: 'inherit' });
        
        // Use archiver to create zip
        const { default: archiver } = await import('archiver');
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => {
          console.log(`✓ Successfully created ${outputFilename} using Node.js archiver (${archive.pointer()} bytes)`);
        });
        
        archive.on('error', (err) => {
          throw err;
        });
        
        archive.pipe(output);
        archive.directory('src/', false);
        await archive.finalize();
        return;
      }
    }
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  } finally {
    // Ensure we're back in the root directory
    try {
      process.chdir('..');
    } catch (e) {
      // Already in root or error occurred
    }
  }
}

// Run the build function
build().catch(error => {
  console.error('Build failed:', error.message);
  process.exit(1);
});
