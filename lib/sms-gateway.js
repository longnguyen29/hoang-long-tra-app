import crypto from "node:crypto";

const DEFAULT_ENDPOINT = "https://api.sms-gate.app/3rdparty/v1/messages";
const DEFAULT_TTL_SECONDS = 10 * 60;
const DEFAULT_PBKDF2_ITERATIONS = 75_000;

function clean(value) {
  return String(value || "").trim();
}
export function readSmsGatewayConfig(env = process.env) {
  const simNumber = Number.parseInt(clean(env.SMS_GATEWAY_SIM_NUMBER) || "1", 10);
  const config = {
    endpoint: clean(env.SMS_GATEWAY_ENDPOINT) || DEFAULT_ENDPOINT,
    accessToken: clean(env.SMS_GATEWAY_ACCESS_TOKEN),
    username: clean(env.SMS_GATEWAY_USERNAME),
    password: clean(env.SMS_GATEWAY_PASSWORD),
    deviceId: clean(env.SMS_GATEWAY_DEVICE_ID),
    simNumber: Number.isInteger(simNumber) && simNumber >= 1 && simNumber <= 3 ? simNumber : 1,
    passphrase: clean(env.SMS_GATEWAY_ENCRYPTION_PASSPHRASE),
  };
  const missing = [
    ["SMS_GATEWAY_DEVICE_ID", config.deviceId],
    ["SMS_GATEWAY_ENCRYPTION_PASSPHRASE", config.passphrase],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (!config.accessToken && (!config.username || !config.password)) {
    missing.unshift("SMS_GATEWAY_ACCESS_TOKEN_or_USERNAME_PASSWORD");
  }
  return { ...config, missing, ready: missing.length === 0 };
}

// SMSGate's end-to-end format. The same passphrase lives on the Android device;
// the public relay only sees separately encrypted phone/content fields.
export function encryptSmsGatewayField(value, passphrase, iterations = DEFAULT_PBKDF2_ITERATIONS) {
  if (!clean(passphrase)) throw new Error("sms_gateway_passphrase_missing");
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(passphrase, salt, iterations, 32, "sha1");
  const cipher = crypto.createCipheriv("aes-256-cbc", key, salt);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return `$aes-256-cbc/pbkdf2-sha1$i=${iterations}$${salt.toString("base64")}$${encrypted.toString("base64")}`;
}

export async function sendSmsGatewayMessage({
  id,
  phone,
  text,
  config = readSmsGatewayConfig(),
  fetchImpl = fetch,
  ttl = DEFAULT_TTL_SECONDS,
}) {
  if (!config.ready) throw new Error(`sms_gateway_not_configured:${config.missing.join(",")}`);
  if (!clean(id) || !clean(phone) || !clean(text)) throw new Error("sms_gateway_invalid_message");

  const response = await fetchImpl(`${config.endpoint}?skipPhoneValidation=true&deviceActiveWithin=12`, {
    method: "POST",
    headers: {
      Authorization: config.accessToken
        ? `Bearer ${config.accessToken}`
        : `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: clean(id),
      textMessage: { text: encryptSmsGatewayField(text, config.passphrase) },
      phoneNumbers: [encryptSmsGatewayField(phone, config.passphrase)],
      deviceId: config.deviceId,
      simNumber: config.simNumber,
      ttl: Math.max(60, Math.min(3600, Number(ttl) || DEFAULT_TTL_SECONDS)),
      priority: 0,
      withDeliveryReport: true,
      isEncrypted: true,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = clean(payload?.message || payload?.error || response.statusText).slice(0, 240);
    throw new Error(`sms_gateway_${response.status}${detail ? `:${detail}` : ""}`);
  }
  return payload;
}
