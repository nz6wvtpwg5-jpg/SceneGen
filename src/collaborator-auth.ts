import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authenticateCollaboratorLogin, authenticateCollaboratorPassword, authenticateDaySheetInvitation } from '@/lib/auth-db';

const secureCookies = process.env.NODE_ENV === 'production';
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: secureCookies };
const cookieName = (name: string, hostOnly = false) => `${secureCookies ? (hostOnly ? '__Host-' : '__Secure-') : ''}scenegen.collaborator-${name}`;
const secret = process.env.COLLABORATOR_AUTH_SECRET || (secureCookies ? undefined : process.env.NEXTAUTH_SECRET);

export const { handlers: collaboratorHandlers, auth: collaboratorAuth } = NextAuth({
  trustHost: true,
  basePath: '/api/collaborator-auth',
  secret,
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
  cookies: {
    sessionToken: { name: cookieName('session'), options: cookieOptions },
    callbackUrl: { name: cookieName('callback'), options: cookieOptions },
    csrfToken: { name: cookieName('csrf', true), options: cookieOptions },
  },
  providers: [
    Credentials({
      id: 'collaborator-credentials',
      name: 'Collaborator email and password',
      credentials: {
        email: { label: 'Email address', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = String(credentials.email || '').trim().toLowerCase();
        const password = String(credentials.password || '');
        if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 1) return null;
        const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
        const user = await authenticateCollaboratorPassword(email, password, ip);
        return user ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
      },
    }),
    Credentials({
      id: 'invitation',
      name: 'Day-sheet invitation',
      credentials: { token: { label: 'Invitation token', type: 'text' } },
      async authorize(credentials) {
        const invitationToken = String(credentials.token || '');
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(invitationToken)) return null;
        const user = await authenticateDaySheetInvitation(invitationToken);
        return user ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
      },
    }),
    Credentials({
      id: 'collaborator-link',
      name: 'Collaborator email link',
      credentials: { token: { label: 'Sign-in token', type: 'text' } },
      async authorize(credentials) {
        const loginToken = String(credentials.token || '');
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(loginToken)) return null;
        const user = await authenticateCollaboratorLogin(loginToken);
        return user ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = String(token.id || token.sub || '');
      return session;
    },
  },
});
