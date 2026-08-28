import { timingSafeEqual, verify } from "node:crypto";

// Public verification key published in Vietnam Post's MyVNP webhook documentation.
export const VIETNAM_POST_PUBLIC_KEY = [
  "-----BEGIN PUBLIC KEY-----",
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuAYZvjAsrSnyhl8lQxZk",
  "lGywLaMfE8sLBQLIo3Q8kyW9jrpCVttyUAAP+IdaEuLYx4T6hV7MgKqJlkQAyikY",
  "1bkos7Gj0KkTUKv0gf7KL8+v55nbObdBagjb+amX/wbuWXYhJ3m67PI63tHbm1Go",
  "eyUeVmZh+XOcXrFoCts+Z+S590w2cfGfo8h60sp4TOu+EiNZq/jvcWCSDA+xszSd",
  "bOagCY0MXBFCG7iQ3WQlS3A3VcFILOIBwT75j/CIYG+jbGrrvRhrU+eu7C4hboG9",
  "wNVrDtxIUYjxoFH8OpFgxaCoYGBCAhXjtWC+MpzcR44l1Kku1wlzQLzh6dXgI3fP",
  "OwIDAQAB",
  "-----END PUBLIC KEY-----",
].join("\n");

export function secretsMatch(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string" || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyVietnamPostSignature(payload, publicKey = VIETNAM_POST_PUBLIC_KEY) {
  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (!first?.itemCode || first.status === undefined || !payload?.sendDate || !payload?.signature) return false;
  const signedValue = `MYVNP${payload.sendDate}${first.itemCode}${first.status}`;
  try {
    return verify(
      "RSA-SHA256",
      Buffer.from(signedValue, "utf8"),
      publicKey,
      Buffer.from(payload.signature, "base64"),
    );
  } catch {
    return false;
  }
}
