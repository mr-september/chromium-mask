# Release Process

This document describes the automated release process for Chrome Mask for Opera.

## Automatic Releases

Releases are automatically created when you push a version tag to the repository.

### Creating a Release

1. **Update the version** in both `package.json` and `src/manifest.json`
2. **Commit the changes**:
   ```bash
   git add package.json src/manifest.json
   git commit -m "Bump version to X.Y.Z"
   ```
3. **Create and push a tag**:
   ```bash
   git tag X.Y.Z
   git push origin X.Y.Z
   ```

The GitHub Actions workflow will automatically:

- Build the extension
- Run tests and linting
- Create a GitHub release
- Upload the built extension ZIP file
- Generate release notes from recent commits

### Manual Release

You can also trigger a release manually from the GitHub Actions tab:

1. Go to the "Actions" tab in the repository
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Enter the version number (e.g., "1.0.2")
5. Click "Run workflow"

## Version Format

- Use semantic versioning: `MAJOR.MINOR.PATCH`
- Tags can be with or without 'v' prefix: `1.0.1` or `v1.0.1`
- Pre-release versions use suffixes: `1.0.1-beta.1`, `1.0.1-rc.1`

## Files Updated During Release

The release process automatically updates:

- `package.json` - version field
- `src/manifest.json` - version field

## Artifacts

Each release includes:

- `chrome-mask-for-opera.zip` - Ready-to-install extension package
- Automatic release notes generated from commit history
- Installation instructions
