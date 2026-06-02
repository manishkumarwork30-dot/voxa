import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const iv = Buffer.alloc(16, 0); // Initialization vector (should be random in production, but using fixed for simplicity)

/**
 * Encrypt text using AES-256
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
}

/**
 * Decrypt text using AES-256
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(Buffer.from(encryptedText, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}