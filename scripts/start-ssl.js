#!/usr/bin/env node

const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const fs = require('fs');

const localCertPath = path.join(__dirname, '..', 'certs', 'server.crt');
const localKeyPath = path.join(__dirname, '..', 'certs', 'server.key');

const devCertDir = path.join(os.homedir(), '.office-addin-dev-certs');
const devCertPath = path.join(devCertDir, 'localhost.crt');
const devKeyPath = path.join(devCertDir, 'localhost.key');

const certPath = fs.existsSync(localCertPath) ? localCertPath : devCertPath;
const keyPath = fs.existsSync(localKeyPath) ? localKeyPath : devKeyPath;

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
  '--proxy-config',
  'proxy.conf.json',
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
