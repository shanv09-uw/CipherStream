// Helper to convert ArrayBuffer <-> Base64
const buf2hex = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const hex2buf = (b64) => {
  const binary_string = window.atob(b64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// --- E2EE Chat PKI ---

export async function generateRSAKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
}

export async function encryptMessage(plaintext, recipientPublicKeyJwk, myPublicKeyJwk) {
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);
  const encryptedPayloadBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encodedText
  );

  const combinedPayload = new Uint8Array(iv.length + encryptedPayloadBuffer.byteLength);
  combinedPayload.set(iv, 0);
  combinedPayload.set(new Uint8Array(encryptedPayloadBuffer), iv.length);
  const encryptedPayloadB64 = buf2hex(combinedPayload.buffer);

  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  
  const rsaRecipientPubKey = await window.crypto.subtle.importKey(
    "jwk", recipientPublicKeyJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]
  );
  
  const rsaMyPubKey = await window.crypto.subtle.importKey(
    "jwk", myPublicKeyJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]
  );

  const [recipientAesBuffer, myAesBuffer] = await Promise.all([
    window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaRecipientPubKey, rawAesKey),
    window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaMyPubKey, rawAesKey)
  ]);

  return {
    encrypted_aes_key: buf2hex(recipientAesBuffer),
    sender_encrypted_aes_key: buf2hex(myAesBuffer),
    encrypted_payload: encryptedPayloadB64
  };
}

export async function decryptMessage(encryptedAesKeyB64, encryptedPayloadB64, myPrivateKeyJwk) {
  try {
    if (!encryptedAesKeyB64) return "[Error: No Key Found]";

    const rsaPrivKey = await window.crypto.subtle.importKey(
      "jwk", myPrivateKeyJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]
    );

    const encryptedAesBuffer = hex2buf(encryptedAesKeyB64);
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" }, rsaPrivKey, encryptedAesBuffer
    );

    const aesKey = await window.crypto.subtle.importKey(
      "raw", rawAesKey, { name: "AES-GCM" }, false, ["decrypt"]
    );

    const payloadBuffer = hex2buf(encryptedPayloadB64);
    const iv = payloadBuffer.slice(0, 12);
    const data = payloadBuffer.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) }, aesKey, data
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[Encrypted Message - Unable to Decrypt]";
  }
}

// --- Escrow Wrap / Unwrap (PBKDF2) ---

const deriveKeyFromPassword = async (password, saltBuffer) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export async function wrapPrivateKey(privateKeyJwk, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const wrappingKey = await deriveKeyFromPassword(password, salt);
  
  const enc = new TextEncoder();
  const serializedJwk = JSON.stringify(privateKeyJwk);
  const data = enc.encode(serializedJwk);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv }, wrappingKey, data
  );

  // Payload: [16 bytes SALT] + [12 bytes IV] + [Ciphertext]
  const payload = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
  payload.set(salt, 0);
  payload.set(iv, salt.length);
  payload.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

  return buf2hex(payload.buffer);
}

export async function unwrapPrivateKey(wrappedPayloadB64, password) {
  const payloadBuffer = hex2buf(wrappedPayloadB64);
  const payloadArray = new Uint8Array(payloadBuffer);
  
  const salt = payloadArray.slice(0, 16);
  const iv = payloadArray.slice(16, 28);
  const ciphertext = payloadArray.slice(28);

  const wrappingKey = await deriveKeyFromPassword(password, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv }, wrappingKey, ciphertext
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
  } catch (err) {
    throw new Error("Local decryption failed: Incorrect Master Password");
  }
}
