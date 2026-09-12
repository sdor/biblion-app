#!/usr/bin/env node

const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const certDir = path.join(os.homedir(), '.office-addin-dev-certs');
const certPath = path.join(certDir, 'localhost.crt');
const keyPath = path.join(certDir, 'localhost.key');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const args = [
  'ng',
  'serve',
  '--host',
  '0.0.0.0',
  '--ssl',
  '--ssl-cert',
  certPath,
  '--ssl-key',
  keyPath,
  ...process.argv.slice(2)
];

console.log(`Starting Biblion with SSL on ${isWindows ? 'Windows' : process.platform}...`);
console.log(`Certificate: ${certPath}`);
console.log(`Key:         ${keyPath}`);

const child = spawn(npxCmd, args, {
  stdio: 'inherit',
  shell: isWindows
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
