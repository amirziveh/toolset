import crypto from 'crypto';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate a license key for the Proforma licensing system.
 * Usage: node generate-key.js <phone_number> <days_until_expiry>
 */

function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Error: Missing required arguments.');
    console.error('Usage: node generate-key.js <phone_number> <days_until_expiry>');
    console.error('Example: node generate-key.js 09123456789 365');
    process.exit(1);
  }

  const [phone, daysStr] = args;
  const days = parseInt(daysStr, 10);

  if (isNaN(days) || days <= 0) {
    console.error('Error: days_until_expiry must be a positive integer.');
    process.exit(1);
  }

  // Read the private key file
  const privateKeyPath = path.join(__dirname, 'private.key');

  let privateKey;
  try {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  } catch (err) {
    console.error(`Error: Could not read private key file at "${privateKeyPath}".`);
    console.error('Ensure private.key exists in the same directory as generate-key.js.');
    process.exit(1);
  }

  // Build the payload
  const exp = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
  const payload = JSON.stringify({ phone, exp });

  // Base64 encode the payload (URL-safe Base64)
  const base64Payload = Buffer.from(payload, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Sign the payload with RSA-SHA256
  let signature;
  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(payload, 'utf8');
    signature = sign.sign(privateKey, 'base64');
  } catch (err) {
    console.error('Error: Failed to sign the payload. Ensure private.key contains a valid RSA private key.');
    process.exit(1);
  }

  // Base64 encode the signature (URL-safe Base64)
  const base64Signature = signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Output the final license key
  const licenseKey = `${base64Payload}.${base64Signature}`;
  console.log(licenseKey);
}

main();