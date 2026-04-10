/**
 * Credential Encryption Utility
 * Uses AES-256-GCM for reversible encryption of platform credentials
 * This is different from bcrypt which is one-way hashing
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const SALT_LENGTH = 32; // 32 bytes for salt

// Get encryption key from environment or generate a secure default
// IMPORTANT: In production, this should be set via environment variable
const getEncryptionKey = () => {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key) {
    console.warn(
      'WARNING: CREDENTIAL_ENCRYPTION_KEY not set in environment. Using default key. Set this in production!'
    );
    // Default key for development - 32 bytes (256 bits)
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', 32);
  }
  // Derive a 32-byte key from the environment variable
  return crypto.scryptSync(key, 'credential-salt', 32);
};

/**
 * Encrypt a plain text password
 * @param {string} plainText - The plain text password to encrypt
 * @returns {string} - Encrypted string in format: iv:authTag:encryptedData (base64)
 */
const encryptCredential = (plainText) => {
  if (!plainText) return null;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv, authTag, and encrypted data
    // Format: iv:authTag:encryptedData (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting credential:', error.message);
    throw new Error('Failed to encrypt credential');
  }
};

/**
 * Decrypt an encrypted password
 * @param {string} encryptedText - The encrypted string in format: iv:authTag:encryptedData
 * @returns {string} - The decrypted plain text password
 */
const decryptCredential = (encryptedText) => {
  if (!encryptedText) return null;

  try {
    const key = getEncryptionKey();
    
    // Split the encrypted text into components
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted credential format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encryptedData = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting credential:', error.message);
    throw new Error('Failed to decrypt credential');
  }
};

/**
 * Check if a string is a bcrypt hash (legacy format, cannot be decrypted)
 * @param {string} text - The text to check
 * @returns {boolean} - True if the text is a bcrypt hash
 */
const isBcryptHash = (text) => {
  if (!text || typeof text !== 'string') return false;
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
  return /^\$2[ayb]\$.{56}$/.test(text);
};

/**
 * Check if a string is already encrypted (has the expected AES format)
 * @param {string} text - The text to check
 * @returns {boolean} - True if the text appears to be AES encrypted
 */
const isEncrypted = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  // If it's a bcrypt hash, it's not AES encrypted
  if (isBcryptHash(text)) return false;
  
  const parts = text.split(':');
  if (parts.length !== 3) return false;
  
  // Check if all parts are valid base64
  try {
    Buffer.from(parts[0], 'base64');
    Buffer.from(parts[1], 'base64');
    Buffer.from(parts[2], 'base64');
    return true;
  } catch {
    return false;
  }
};

/**
 * Encrypt passwords in other_platform_credentials array
 * @param {Array} credentials - Array of platform credentials
 * @returns {Array} - Array with encrypted userPass fields
 */
const encryptPlatformCredentials = (credentials) => {
  if (!credentials || !Array.isArray(credentials) || credentials.length === 0) {
    return credentials;
  }

  return credentials.map((cred) => {
    const encryptedCred = { ...cred };
    // Only encrypt if userPass is provided and not already encrypted
    if (cred.userPass && !isEncrypted(cred.userPass)) {
      encryptedCred.userPass = encryptCredential(cred.userPass);
    }
    return encryptedCred;
  });
};

/**
 * Decrypt passwords in other_platform_credentials array
 * @param {Array} credentials - Array of platform credentials with encrypted passwords
 * @returns {Array} - Array with decrypted userPass fields
 */
const decryptPlatformCredentials = (credentials) => {
  if (!credentials || !Array.isArray(credentials) || credentials.length === 0) {
    return credentials;
  }

  return credentials.map((cred) => {
    const decryptedCred = { ...cred };
    if (cred.userPass && isEncrypted(cred.userPass)) {
      try {
        decryptedCred.userPass = decryptCredential(cred.userPass);
      } catch (error) {
        // If decryption fails, leave as is
        console.error('Failed to decrypt credential for platform:', cred.platform_name);
      }
    }
    return decryptedCred;
  });
};

/**
 * Decrypt a single platform credential by index
 * @param {Array} credentials - Array of platform credentials
 * @param {number} index - Index of the credential to decrypt
 * @returns {Object} - The credential with decrypted password
 */
const decryptSingleCredential = (credentials, index) => {
  if (!credentials || !Array.isArray(credentials) || index >= credentials.length) {
    return null;
  }

  const cred = { ...credentials[index] };
  if (cred.userPass) {
    if (isBcryptHash(cred.userPass)) {
      // Bcrypt is one-way hashing, cannot be decrypted
      throw new Error('This password is stored as a bcrypt hash and cannot be decrypted. Please update the credential with a new password.');
    } else if (isEncrypted(cred.userPass)) {
      cred.userPass = decryptCredential(cred.userPass);
    }
    // If neither bcrypt nor AES encrypted, assume it's plain text (shouldn't happen in production)
  }
  return cred;
};

/**
 * Decrypt a single platform credential by ID
 * @param {Array} credentials - Array of platform credentials
 * @param {string} credentialId - MongoDB ObjectId of the credential to decrypt
 * @returns {Object} - The credential with decrypted password
 */
const decryptSingleCredentialById = (credentials, credentialId) => {
  if (!credentials || !Array.isArray(credentials) || !credentialId) {
    return null;
  }

  const cred = credentials.find(c => c._id && c._id.toString() === credentialId.toString());
  if (!cred) {
    return null;
  }

  const decryptedCred = { ...cred };
  if (decryptedCred.userPass) {
    if (isBcryptHash(decryptedCred.userPass)) {
      // Bcrypt is one-way hashing, cannot be decrypted
      throw new Error('This password is stored as a bcrypt hash and cannot be decrypted. Please update the credential with a new password.');
    } else if (isEncrypted(decryptedCred.userPass)) {
      decryptedCred.userPass = decryptCredential(decryptedCred.userPass);
    }
    // If neither bcrypt nor AES encrypted, assume it's plain text (shouldn't happen in production)
  }
  return decryptedCred;
};

module.exports = {
  encryptCredential,
  decryptCredential,
  isEncrypted,
  isBcryptHash,
  encryptPlatformCredentials,
  decryptPlatformCredentials,
  decryptSingleCredential,
  decryptSingleCredentialById,
};


