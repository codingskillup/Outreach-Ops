import crypto from "crypto";

function getEncryptionKey() {
  const value =
    process.env.INTEGRATION_ENCRYPTION_KEY;

  if (!value) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY is missing"
    );
  }

  const key = Buffer.from(
    value,
    "hex"
  );

  if (key.length !== 32) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be 32 bytes"
    );
  }

  return key;
}

export function encryptApiKey(
  apiKey: string
) {
  const key =
    getEncryptionKey();

  const iv =
    crypto.randomBytes(12);

  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      key,
      iv
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        apiKey,
        "utf8"
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptApiKey(
  encryptedValue: string
) {
  const key =
    getEncryptionKey();

  const [
    ivHex,
    authTagHex,
    encryptedHex,
  ] =
    encryptedValue.split(":");

  if (
    !ivHex ||
    !authTagHex ||
    !encryptedHex
  ) {
    throw new Error(
      "Invalid encrypted API key"
    );
  }

  const decipher =
    crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(
        ivHex,
        "hex"
      )
    );

  decipher.setAuthTag(
    Buffer.from(
      authTagHex,
      "hex"
    )
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        Buffer.from(
          encryptedHex,
          "hex"
        )
      ),
      decipher.final(),
    ]);

  return decrypted.toString(
    "utf8"
  );
}