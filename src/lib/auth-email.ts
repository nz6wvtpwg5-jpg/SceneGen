type AuthEmailInput = {
  to: string;
  subject: string;
  actionUrl: string;
  action: string;
  eyebrow?: string;
  introduction?: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character] || character);
const singleEmail = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
const header = (value: string, label: string) => {
  const result = value.trim();
  if (!result || /[\r\n]/.test(result)) throw new Error(`${label} is invalid`);
  return result;
};

function emailConfiguration() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    from: process.env.EMAIL_FROM?.trim() || process.env.AUTH_EMAIL_FROM?.trim(),
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || 'support@scenegen.io',
  };
}

function renderAuthEmail(input: AuthEmailInput) {
  const action = escapeHtml(input.action);
  const actionUrl = escapeHtml(input.actionUrl);
  const eyebrow = escapeHtml(input.eyebrow || 'Account security');
  const introduction = escapeHtml(input.introduction || 'Use the secure button below to continue. This link expires soon and can only be used once.');
  const safetyMessage = input.introduction
    ? 'If you did not expect this invitation, you can safely ignore this email.'
    : 'If you did not request this, you can safely ignore this email.';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3ede3;color:#171713;font-family:Arial,Helvetica,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${action}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3ede3;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fffaf2;border:1px solid #d8d0c3;border-radius:20px;overflow:hidden">
<tr><td style="background:#171713;padding:24px 32px;color:#fff"><strong style="font-size:22px;letter-spacing:3px">SCENEGEN</strong><div style="margin-top:5px;color:#aaa69d;font-size:11px;letter-spacing:3px">LIVE OPERATIONS</div></td></tr>
<tr><td style="padding:38px 32px"><div style="color:#ef4e2f;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${eyebrow}</div><h1 style="font-size:30px;line-height:1.15;margin:14px 0 16px">${action}</h1><p style="font-size:16px;line-height:1.6;color:#625e55;margin:0 0 26px">${introduction}</p><a href="${actionUrl}" style="display:inline-block;background:#ff5738;color:#fff;text-decoration:none;font-weight:700;padding:15px 24px;border-radius:999px">${action}</a><p style="font-size:13px;line-height:1.6;color:#777168;margin:28px 0 0">${safetyMessage} SceneGen will never ask you to send your password by email.</p></td></tr>
<tr><td style="border-top:1px solid #e3dbcf;padding:20px 32px;color:#8a847a;font-size:12px">Questions? Reply to this email or contact support@scenegen.io.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendAuthEmail(input: AuthEmailInput) {
  const { apiKey, from, replyTo } = emailConfiguration();
  if (!apiKey || !from) throw new Error('Resend email delivery is not configured');
  const recipient = header(input.to, 'Email recipient').toLowerCase();
  if (!singleEmail.test(recipient)) throw new Error('Email recipient must contain exactly one address');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: header(from, 'Email sender'),
      to: [recipient],
      reply_to: header(replyTo, 'Email reply-to'),
      subject: header(input.subject, 'Email subject'),
      text: `${input.introduction || input.action}\n\n${input.action}: ${input.actionUrl}\n\nThis secure link expires soon. If you did not expect it, ignore this email.`,
      html: renderAuthEmail(input),
      tags: [{ name: 'category', value: 'authentication' }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !result.id) {
    throw new Error(`Resend rejected the email (${response.status})${result.message ? `: ${result.message}` : ''}`);
  }
  return result.id;
}
