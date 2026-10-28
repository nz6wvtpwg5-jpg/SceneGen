import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit, findActiveCollaboratorByEmail, issueToken } from '@/lib/auth-db';
import { sendAuthEmail } from '@/lib/auth-email';
import { publicAppUrl } from '@/lib/public-app-url';
import { validEmail } from '@/lib/auth-validation';

const responseMessage = 'If that address has active day-sheet access, a secure sign-in link is on its way.';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  try {
    if (validEmail(body.email)) {
      const normalized = body.email.trim().toLowerCase();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const [emailAllowed, ipAllowed] = await Promise.all([
        checkAuthRateLimit('collaborator-login-email', normalized, 5, 3600),
        checkAuthRateLimit('collaborator-login-ip', ip, 20, 3600),
      ]);
      if (emailAllowed && ipAllowed) {
        const user = await findActiveCollaboratorByEmail(normalized);
        if (user) {
          const token = await issueToken(user.id, 'collaborator_login', 20);
          const baseUrl = publicAppUrl(request.nextUrl.origin);
          await sendAuthEmail({ to: user.email, subject: 'Open your SceneGen day sheets', action: 'Access my day sheets', actionUrl: `${baseUrl}/collaborator-access/verify?token=${encodeURIComponent(token)}` });
        }
      }
    }
  } catch (error) {
    console.error('Collaborator sign-in request failed:', error instanceof Error ? error.message : 'Unknown error');
  }
  return NextResponse.json({ message: responseMessage }, { status: 202 });
}
