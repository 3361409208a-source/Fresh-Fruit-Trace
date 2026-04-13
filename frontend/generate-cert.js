const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const certDir = path.join(__dirname, 'cert');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);

const keyFile = path.join(certDir, 'key.pem');
const certFile = path.join(certDir, 'cert.pem');

if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  console.log('证书已存在，跳过生成');
  process.exit(0);
}

// 使用 Node.js 内置 crypto 生成自签名证书
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

// 用 openssl 命令行格式生成（通过 child_process 调用自身）
// 由于没有 openssl，我们用 PKCS#12 方式绕过
// 实际上 Node 19+ 支持 X509Certificate，但我们用更简单的方式

// 生成 PEM 格式的 key
const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

// 生成证书需要用自签名方式，Node crypto 不直接支持生成 X509
// 所以我们用 node-forge，但需要确保证书格式正确
try {
  const forge = require('node-forge');
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{ name: 'commonName', value: 'Fresh-Fruit-Trace' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, keyCertSign: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '192.168.2.236' },
        { type: 2, value: 'localhost' },
      ]
    }
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  fs.writeFileSync(keyFile, forge.pki.privateKeyToPem(keys.privateKey));
  fs.writeFileSync(certFile, forge.pki.certificateToPem(cert));
  console.log('✅ 自签名证书已生成到 cert/ 目录');
} catch (e) {
  console.error('node-forge 生成失败，尝试备用方式:', e.message);
  // 备用：生成一个简单的开发用证书
  // 用 openssl x509 格式手动构造（不依赖任何外部库）
  console.error('请安装 mkcert 或 openssl 来生成 HTTPS 证书');
  process.exit(1);
}
