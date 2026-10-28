const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const singleEmail = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
const header = (value, label) => {
  const result = String(value || '').trim();
  if (!result || /[\r\n]/.test(result)) throw new Error(`${label} is invalid`);
  return result;
};

function configuration() {
  return {
    apiKey: String(process.env.RESEND_API_KEY || '').trim(),
    from: String(process.env.EMAIL_FROM || process.env.AUTH_EMAIL_FROM || '').trim(),
    replyTo: String(process.env.EMAIL_REPLY_TO || 'support@scenegen.io').trim(),
  };
}

async function sendTransactionalEmail({ to, subject, heading, body, action, actionUrl, category }) {
  const { apiKey, from, replyTo } = configuration();
  if (!apiKey || !from) throw new Error('Resend email delivery is not configured');
  const recipient = header(to, 'Email recipient').toLowerCase();
  if (!singleEmail.test(recipient)) throw new Error('Email recipient must contain exactly one address');
  const safeFrom = header(from, 'Email sender');
  const safeReplyTo = header(replyTo, 'Email reply-to');
  const safeSubject = header(subject, 'Email subject');
  const safeHeading = escapeHtml(heading);
  const safeBody = escapeHtml(body);
  const safeAction = escapeHtml(action);
  const safeUrl = escapeHtml(actionUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: safeFrom,
      to: [recipient],
      reply_to: safeReplyTo,
      subject: safeSubject,
      text: `${heading}\n\n${body}\n\n${action}: ${actionUrl}\n\nIf you were not expecting this message, contact support@scenegen.io.`,
      html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3ede3;color:#171713;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3ede3;padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fffaf2;border:1px solid #d8d0c3;border-radius:20px;overflow:hidden"><tr><td style="background:#171713;padding:24px 32px;color:#fff"><strong style="font-size:22px;letter-spacing:3px">SCENEGEN</strong><div style="margin-top:5px;color:#aaa69d;font-size:11px;letter-spacing:3px">LIVE OPERATIONS</div></td></tr><tr><td style="padding:38px 32px"><div style="color:#ef4e2f;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">External collaboration</div><h1 style="font-size:30px;line-height:1.15;margin:14px 0 16px">${safeHeading}</h1><p style="font-size:16px;line-height:1.6;color:#625e55">${safeBody}</p><a href="${safeUrl}" style="display:inline-block;margin-top:12px;background:#ff5738;color:#fff;text-decoration:none;font-weight:700;padding:15px 24px;border-radius:999px">${safeAction}</a><p style="font-size:13px;line-height:1.6;color:#777168;margin-top:28px">This private link is intended only for the invited email address.</p></td></tr><tr><td style="border-top:1px solid #e3dbcf;padding:20px 32px;color:#8a847a;font-size:12px">Questions? Reply to this email or contact support@scenegen.io.</td></tr></table></td></tr></table></body></html>`,
      tags: [{ name: 'category', value: category }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.id) {
    throw new Error(`Resend rejected the email (${response.status})${result.message ? `: ${result.message}` : ''}`);
  }
  return result.id;
}

function sendDaySheetInvitation({ to, recipientName, entityName, scope, invitationUrl, inviteAsBookingAgent = false, accessRole = 'collaborator' }) {
  if (inviteAsBookingAgent) {
    return sendTransactionalEmail({
      to,
      subject: `${entityName} invited you to become their booking agent on SceneGen`,
      heading: `${entityName} has invited you to join as their booking agent`,
      body: `Hello ${recipientName}. ${entityName} has invited you to represent them as a booking agent on SceneGen. The invitation also gives you access to ${scope}. Review and accept it using ${to}; after acceptance you can activate your booking-agent workspace with ${entityName} already on your roster.`,
      action: 'Review and accept invitation',
      actionUrl: invitationUrl,
      category: 'booking-agent-invitation',
    });
  }
  if (['band_member', 'crew_member'].includes(accessRole)) {
    const roleLabel = accessRole === 'crew_member' ? 'crew member' : 'band member';
    return sendTransactionalEmail({
      to,
      subject: `${entityName} invited you to view their day sheets`,
      heading: `${entityName} has invited you as a ${roleLabel}`,
      body: `Hello ${recipientName}. You have read-only access to ${scope}, including existing schedule, travel, flight and accommodation details. Financial information, promoter contact details, private notes and documents are not included.`,
      action: 'View assigned day sheets',
      actionUrl: invitationUrl,
      category: `${accessRole.replace('_', '-')}-day-sheets`,
    });
  }
  return sendTransactionalEmail({
    to,
    subject: `${entityName} invited you to SceneGen day sheets`,
    heading: `${entityName} has invited you`,
    body: `Hello ${recipientName}. You now have access to ${scope}. Sign in using ${to} to view the day sheets you have been assigned.`,
    action: 'Access day sheets',
    actionUrl: invitationUrl,
    category: 'day-sheet-invitation',
  });
}

module.exports = { configuration, escapeHtml, sendTransactionalEmail, sendDaySheetInvitation };
