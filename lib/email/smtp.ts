import nodemailer from "nodemailer";

const DEFAULT_FROM = "contact@networkk.co";

type EmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
};

let cachedTransport: nodemailer.Transporter | null = null;

function getEnvVar(name: string) {
  const value = process.env[name];
  return value ? String(value).trim() : "";
}

function getTransport() {
  if (cachedTransport) return cachedTransport;

  const host = getEnvVar("SMTP_HOST");
  const port = Number(getEnvVar("SMTP_PORT") || 465);
  const user = getEnvVar("SMTP_USER");
  const pass = getEnvVar("SMTP_PASS");
  const secureEnv = getEnvVar("SMTP_SECURE");
  const secure = secureEnv ? secureEnv === "true" : port === 465;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST/SMTP_USER/SMTP_PASS must be set");
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransport;
}

function getFrom() {
  const fromEmail = getEnvVar("SMTP_FROM") || getEnvVar("SMTP_USER") || DEFAULT_FROM;
  const fromName = getEnvVar("SMTP_FROM_NAME") || "Networkk";
  return `${fromName} <${fromEmail}>`;
}

export function getAppBaseUrl() {
  const raw =
    getEnvVar("APP_BASE_URL") ||
    getEnvVar("NEXT_PUBLIC_APP_URL") ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export async function sendEmail(payload: EmailPayload) {
  const host = getEnvVar("SMTP_HOST");
  const user = getEnvVar("SMTP_USER");
  const pass = getEnvVar("SMTP_PASS");

  if (!host || !user || !pass) {
    console.warn("[email] SMTP not configured; skipping send.");
    return { ok: false, skipped: true };
  }

  const transporter = getTransport();
  await transporter.sendMail({
    from: getFrom(),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return { ok: true };
}

export type { EmailPayload };
