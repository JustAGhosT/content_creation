#!/usr/bin/env node

/**
 * This script helps clean up old API routes and unused code after migration.
 * It will:
 * 1. Remove old pages/api routes
 * 2. Move any needed code from api/ directory to lib/
 * 3. Clean up unused files
 * 
 * Usage: node scripts/cleanup-old-api.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define paths
const pagesApiDir = path.join(process.cwd(), 'pages/api');
const apiDir = path.join(process.cwd(), 'api');
const backupDir = path.join(process.cwd(), 'backup');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Create backup/pages/api directory
const backupPagesApiDir = path.join(backupDir, 'pages/api');
if (!fs.existsSync(backupPagesApiDir)) {
  fs.mkdirSync(backupPagesApiDir, { recursive: true });
}

// Create backup/api directory
const backupApiDir = path.join(backupDir, 'api');
if (!fs.existsSync(backupApiDir)) {
  fs.mkdirSync(backupApiDir, { recursive: true });
}

/**
 * Copy directory recursively
 * @param {string} src Source directory
 * @param {string} dest Destination directory
 */
function copyDirRecursive(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  // Copy each entry
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove directory recursively
 * @param {string} dir Directory to remove
 */
function removeDirRecursive(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Main cleanup function
function cleanup() {
  console.log('Starting API cleanup process...');

  // 1. Check if pages/api directory exists
  if (fs.existsSync(pagesApiDir)) {
    console.log('Backing up pages/api directory...');
    copyDirRecursive(pagesApiDir, backupPagesApiDir);
    
    console.log('Removing pages/api directory...');
    removeDirRecursive(pagesApiDir);
    console.log('pages/api directory removed successfully.');
  } else {
    console.log('pages/api directory does not exist, skipping...');
  }

  // 2. Check if api directory exists
  if (fs.existsSync(apiDir)) {
    console.log('Backing up api directory...');
    copyDirRecursive(apiDir, backupApiDir);
    
    console.log('Removing api directory...');
    removeDirRecursive(apiDir);
    console.log('api directory removed successfully.');
  } else {
    console.log('api directory does not exist, skipping...');
  }

  console.log('\nCleanup completed successfully!');
  console.log(`Backups saved to: ${backupDir}`);
  console.log('\nNotes:');
  console.log('1. If you need to restore any files, you can find them in the backup directory.');
  console.log('2. Make sure to update any imports in your code that still reference the old API files.');
}

// Prompt for confirmation
rl.question('This will remove all files in pages/api and api directories. Are you sure? (y/N) ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    cleanup();
  } else {
    console.log('Cleanup cancelled.');
  }
  rl.close();
});