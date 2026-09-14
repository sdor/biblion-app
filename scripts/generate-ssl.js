#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const localIPs = getLocalIPs();
console.log('Detected local IPv4 addresses:', localIPs);

const certDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const certPath = path.join(certDir, 'server.crt');
const keyPath = path.join(certDir, 'server.key');

let hasMkcert = false;
try {
  execSync('which mkcert', { stdio: 'ignore' });
  hasMkcert = true;
} catch (e) {
  hasMkcert = false;
}

if (hasMkcert) {
  console.log('\n--> Found mkcert! Generating locally trusted certificate...');
  try {
    execSync('mkcert -install', { stdio: 'inherit' });
    const hosts = ['localhost', '127.0.0.1', ...localIPs].join(' ');
    execSync(`mkcert -key-file "${keyPath}" -cert-file "${certPath}" ${hosts}`, { stdio: 'inherit' });
    console.log(`\n✅ SSL Certificate generated successfully at:\n  Cert: ${certPath}\n  Key:  ${keyPath}`);
    process.exit(0);
  } catch (err) {
    console.error('Error running mkcert, falling back to OpenSSL:', err.message);
  }
}

console.log('\n--> Generating SSL certificate using OpenSSL...');
const cnfPath = path.join(certDir, 'openssl.cnf');

const altNames = ['DNS.1 = localhost', 'IP.1 = 127.0.0.1'];
localIPs.forEach((ip, idx) => {
  altNames.push(`IP.${idx + 2} = ${ip}`);
});

const cnfContent = `
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = req_distinguished_name
x509_extensions    = v3_req

[req_distinguished_name]
C  = US
ST = Dev
L  = Local
O  = Biblion Dev
OU = Office Addin
CN = localhost

[v3_req]
basicConstraints = CA:TRUE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
${altNames.join('\n')}
`;

fs.writeFileSync(cnfPath, cnfContent.trim());

try {
  execSync(`openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -config "${cnfPath}"`, { stdio: 'inherit' });
  console.log(`\n✅ SSL Certificate generated successfully at:\n  Cert: ${certPath}\n  Key:  ${keyPath}`);
} catch (err) {
  console.error('Failed to generate SSL cert via OpenSSL:', err.message);
}
