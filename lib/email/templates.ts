import { getAppBaseUrl } from "./smtp";
import type { EmailPayload } from "./smtp";

type Person = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
};

type Money = {
  amount?: number | string | null;
  currency?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatName(person?: Person) {
  if (!person) return "there";
  const personal = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  if (personal) return personal;
  if (person.companyName) return person.companyName;
  return "there";
}

function formatMoney(money?: Money) {
  const amountNum = Number(money?.amount ?? 0);
  const currency = String(money?.currency || "EGP").toUpperCase();
  if (!Number.isFinite(amountNum)) return `0 ${currency}`;
  return `${amountNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function baseUrl(path: string) {
  return `${getAppBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function wrapHtml(title: string, bodyHtml: string) {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f7f7;">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px;font-family:Arial,sans-serif;color:#1d1d1f;">
      <div style="background:#ffffff;border-radius:18px;padding:28px;border:1px solid #eee;">
        <h1 style="font-size:22px;margin:0 0 16px;">${safeTitle}</h1>
        ${bodyHtml}
        <p style="margin:24px 0 0;font-size:12px;color:#888;">Networkk, contact@networkk.co</p>
      </div>
    </div>
  </body>
</html>`;
}

export function buildWelcomeEmail(params: {
  person?: Person;
  roleLabel: "client" | "freelancer";
  signInPath: string;
}): Omit<EmailPayload, "to"> {
  const name = formatName(params.person);
  const signInUrl = baseUrl(params.signInPath);
  const subject = "Welcome to Networkk";
  const text = `Hi ${name},\n\nYour ${params.roleLabel} account is active.\nSign in here: ${signInUrl}\n\nIf you did not create this account, reply to this email.`;
  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;">Your ${escapeHtml(params.roleLabel)} account is active.</p>
     <p style="margin:0 0 16px;"><a href="${signInUrl}" style="color:#2563eb;">Sign in to Networkk</a></p>
     <p style="margin:0;font-size:13px;color:#666;">If you did not create this account, reply to this email.</p>`
  );
  return { subject, text, html };
}

export function buildClientActivationEmail(params: {
  person?: Person;
  activationLink: string;
}): Omit<EmailPayload, "to"> {
  const name = formatName(params.person);
  const subject = "Activate your Networkk account";
  const text = `Hi ${name},\n\nPlease confirm your email to activate your account:\n${params.activationLink}\n\nIf you did not create this account, you can ignore this email.`;
  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;">Please confirm your email to activate your account.</p>
     <p style="margin:0 0 16px;"><a href="${params.activationLink}" style="color:#2563eb;">Activate your account</a></p>
     <p style="margin:0;font-size:13px;color:#666;">If you did not create this account, you can ignore this email.</p>`
  );
  return { subject, text, html };
}

export function buildFreelancerUnderReviewEmail(params: {
  person?: Person;
}): Omit<EmailPayload, "to"> {
  const name = formatName(params.person);
  const subject = "Your freelancer account is under review";
  const text = `Hi ${name},\n\nThanks for signing up. Your freelancer account is under review.\nWe will send a confirmation message within 48 hours.\n\nIf you have questions, reply to this email.`;
  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;">Thanks for signing up. Your freelancer account is under review.</p>
     <p style="margin:0 0 12px;">We will send a confirmation message within 48 hours.</p>
     <p style="margin:0;font-size:13px;color:#666;">If you have questions, reply to this email.</p>`
  );
  return { subject, text, html };
}

export function buildJobPostedEmail(params: {
  person?: Person;
  jobTitle: string;
  budget?: Money;
}): Omit<EmailPayload, "to"> {
  const name = formatName(params.person);
  const title = params.jobTitle || "your job";
  const budget = formatMoney(params.budget);
  const dashboardUrl = baseUrl("/client/dashboard");
  const subject = `Job posted: ${title}`;
  const text = `Hi ${name},\n\nYour job "${title}" is now live.\nBudget: ${budget}\nManage it here: ${dashboardUrl}`;
  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;">Your job "${escapeHtml(title)}" is now live.</p>
     <p style="margin:0 0 12px;">Budget: ${escapeHtml(budget)}</p>
     <p style="margin:0 0 16px;"><a href="${dashboardUrl}" style="color:#2563eb;">Open your dashboard</a></p>`
  );
  return { subject, text, html };
}

export function buildProposalReceivedEmail(params: {
  person?: Person;
  senderName: string;
  jobTitle: string;
  conversationId?: string | null;
  role: "client" | "freelancer";
}): Omit<EmailPayload, "to"> {
  const name = formatName(params.person);
  const title = params.jobTitle || "a job";
  const senderName = params.senderName || "Someone";
  const linkBase = params.role === "client" ? "/client/messages" : "/freelancer/messages";
  const link = params.conversationId
    ? `${baseUrl(linkBase)}?conversation_id=${encodeURIComponent(params.conversationId)}`
    : baseUrl(linkBase);
  const subject = `New proposal for ${title}`;
  const text = `Hi ${name},\n\n${senderName} sent you a proposal for "${title}".\nView it here: ${link}`;
  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;">${escapeHtml(senderName)} sent you a proposal for "${escapeHtml(title)}".</p>
     <p style="margin:0 0 16px;"><a href="${link}" style="color:#2563eb;">View the proposal</a></p>`
  );
  return { subject, text, html };
}

export function buildContractConfirmedEmail(params: {
  person?: Person;
  jobTitle: string;
  contractId: number;
  total: Money;
  role: "client" | "freelancer";
}): Omit<EmailPayload, "to"> {
  const name = formatName(params.person);
  const title = params.jobTitle || "your contract";
  const total = formatMoney(params.total);
  const link =
    params.role === "client"
      ? baseUrl(`/client/contracts/${params.contractId}`)
      : baseUrl(`/freelancer/contracts/${params.contractId}`);
  const subject = `Contract confirmed: ${title}`;
  const text = `Hi ${name},\n\nYour contract for "${title}" is active.\nContract ID: #${params.contractId}\nTotal: ${total}\nView details: ${link}`;
  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;">Your contract for "${escapeHtml(title)}" is active.</p>
     <p style="margin:0 0 12px;">Contract ID: #${params.contractId}<br/>Total: ${escapeHtml(total)}</p>
     <p style="margin:0 0 16px;"><a href="${link}" style="color:#2563eb;">View contract details</a></p>`
  );
  return { subject, text, html };
}

export function buildMilestoneSubmittedEmail(params: {
  person?: Person;
  milestoneTitle: string;
  contractId: number;
  submitterName: string;
}): Omit<EmailPayload, "to"> {
  const name = formatName(params.person);
  const title = params.milestoneTitle || "a milestone";
  const link = baseUrl(`/client/contracts/${params.contractId}`);
  const subject = `Milestone submitted: ${title}`;
  const text = `Hi ${name},\n\n${params.submitterName} submitted "${title}".\nReview it here: ${link}`;
  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px;">${escapeHtml(params.submitterName)} submitted "${escapeHtml(title)}".</p>
     <p style="margin:0 0 16px;"><a href="${link}" style="color:#2563eb;">Review milestone</a></p>`
  );
  return { subject, text, html };
}

export function buildPasswordResetEmail(params: { resetLink: string }): Omit<EmailPayload, "to"> {
  const subject = "Reset your Networkk password";
  const text = `You requested a password reset.\nUse this link to set a new password: ${params.resetLink}\n\nIf you did not request this, you can ignore this email.`;
  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;">You requested a password reset.</p>
     <p style="margin:0 0 16px;"><a href="${params.resetLink}" style="color:#2563eb;">Reset your password</a></p>
     <p style="margin:0;font-size:13px;color:#666;">If you did not request this, you can ignore this email.</p>`
  );
  return { subject, text, html };
}
