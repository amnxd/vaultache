
// IMPORTANT: This is a placeholder for demonstration purposes ONLY.
// DO NOT use this in a production environment. It is NOT secure.
// For real applications, use established cryptographic libraries like Web Crypto API or crypto-js.

export function encrypt(text: string, key: string): string {
  if (!key) return text; // No key, no encryption
  try {
    // Simple XOR cipher - NOT SECURE
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode to make it look like ciphertext
  } catch (error) {
    console.error("Encryption failed:", error);
    return text; // Fallback to original text if encryption fails
  }
}

export function decrypt(cipherText: string, key: string): string {
  if (!key) return cipherText; // No key, no decryption
  try {
    const decodedText = atob(cipherText); // Base64 decode
    // Simple XOR cipher - NOT SECURE
    let result = '';
    for (let i = 0; i < decodedText.length; i++) {
      result += String.fromCharCode(decodedText.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (error) {
    console.error("Decryption failed. Likely an invalid key or corrupt data.", error);
    return cipherText; // Fallback to ciphertext if decryption fails
  }
}
