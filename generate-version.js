#!/usr/bin/env node

/**
 * Generate version.js with git commit information
 * This script should be run before deployment to capture the current git version
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitInfo() {
  try {
    // Get short commit hash
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

    // Get current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

    // Get commit date
    const commitDate = execSync('git log -1 --format=%cd --date=short', { encoding: 'utf-8' }).trim();

    // Try to get tag (if exists on this commit)
    let tag = '';
    try {
      tag = execSync('git describe --exact-match --tags 2>/dev/null', { encoding: 'utf-8' }).trim();
    } catch (e) {
      // No tag on this commit, that's okay
    }

    // Get commit message (first line only)
    const commitMessage = execSync('git log -1 --format=%s', { encoding: 'utf-8' }).trim();

    return {
      commitHash,
      branch,
      commitDate,
      tag,
      commitMessage,
      buildDate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting git information:', error.message);
    // Return fallback version info
    return {
      commitHash: 'unknown',
      branch: 'unknown',
      commitDate: 'unknown',
      tag: '',
      commitMessage: 'Version information unavailable',
      buildDate: new Date().toISOString()
    };
  }
}

function generateVersionFile() {
  const gitInfo = getGitInfo();

  // Create version string
  const versionString = gitInfo.tag || gitInfo.commitHash;

  // Generate the version.js file content
  const content = `// Auto-generated file - Do not edit manually
// Generated on: ${gitInfo.buildDate}

export const VERSION_INFO = ${JSON.stringify(gitInfo, null, 2)};

export const VERSION_STRING = "${versionString}";

export function getVersionDisplay() {
  return VERSION_STRING;
}

export function getFullVersionInfo() {
  return \`v\${VERSION_STRING} (\${VERSION_INFO.branch})\`;
}
`;

  // Write to version.js
  const outputPath = path.join(__dirname, 'version.js');
  fs.writeFileSync(outputPath, content, 'utf-8');

  console.log('✓ Version file generated successfully!');
  console.log(`  Version: ${versionString}`);
  console.log(`  Branch: ${gitInfo.branch}`);
  console.log(`  Commit: ${gitInfo.commitHash}`);
  console.log(`  Date: ${gitInfo.commitDate}`);
  if (gitInfo.tag) {
    console.log(`  Tag: ${gitInfo.tag}`);
  }
}

// Run the script
generateVersionFile();
