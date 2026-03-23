import crypto from 'crypto';

export function generateApiKey() {
  // Generates 16 random bytes (32 hex characters)
  const key = crypto.randomBytes(16).toString('hex');
  return `flp_${key}`;
}