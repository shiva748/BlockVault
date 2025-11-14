import { ethers } from "ethers";

const PBKDF2_ITER = 200000;

/**
 * Get MetaMask provider and signer
 */
export async function getMetaMaskSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer;
}

/**
 * Create a deterministic message to sign for encryption/decryption
 * This message will be used to derive the encryption key
 * Uses file hash only to ensure same signature for encryption and decryption
 */
export function createEncryptionMessage(fileHash) {
  return `BlockVault Encryption\nFile Hash: ${fileHash}\n\nSign this message to encrypt/decrypt your file.`;
}

/**
 * Sign a message with MetaMask
 */
export async function signMessageWithMetaMask(message) {
  const signer = await getMetaMaskSigner();
  const signature = await signer.signMessage(message);
  return signature;
}

/**
 * Derive AES key from MetaMask signature
 */
export async function deriveKeyFromSignature(signature, salt) {
  // Convert signature to bytes
  const sigBytes = new TextEncoder().encode(signature);

  // Import signature as key material
  const baseKey = await crypto.subtle.importKey(
    "raw",
    sigBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM key
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITER,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  return aesKey;
}

/**
 * Compute SHA-256 hash of file buffer
 */
export async function hashFile(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Encrypt file using MetaMask signature
 */
export async function encryptFileWithMetaMask(fileBuffer, signature, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveKeyFromSignature(signature, salt);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    fileBuffer
  );

  return {
    iv,
    ciphertext: new Uint8Array(encrypted),
  };
}

/**
 * Decrypt file using MetaMask signature
 */
export async function decryptFileWithMetaMask(encryptedData, signature, salt, iv) {
  const aesKey = await deriveKeyFromSignature(signature, salt);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    encryptedData
  );

  return new Uint8Array(decrypted);
}

/**
 * Helper: Convert buffer to base64
 */
export function bufToBase64(buf) {
  return window.btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/**
 * Helper: Convert base64 to Uint8Array
 */
export function base64ToUint8(b64) {
  const bin = window.atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

