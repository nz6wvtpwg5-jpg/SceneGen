import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authenticateBookingAgentActivation, authenticatePassword, upsertGoogleUser, upsertSocialUser } from "@/lib/auth-db";
import { verifyNativeIdentity, type NativeSocialProvider } from "@/lib/native-social-auth";

class InvalidLogin extends CredentialsSignin {
  code = "invalid_credentials";
}

export const {
  handlers: { GET, POST }, auth, signIn, signOut,
} = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { scope: "openid email profile" } },
    }),
    Credentials({
      id: "native-social",
      name: "Native social sign-in",
      credentials: {
        provider: { label: "Provider", type: "text" },
        idToken: { label: "Identity token", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const provider = String(credentials.provider || "") as NativeSocialProvider;
        if (provider !== "google" && provider !== "apple") return null;
        const identity = await verifyNativeIdentity(provider, String(credentials.idToken || ""), String(credentials.name || ""));
        const user = await upsertSocialUser(identity);
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        const password = String(credentials.password ?? "");
        const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        const user = await authenticatePassword(email, password, forwarded || "unknown");
        if (!user) throw new InvalidLogin();
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    Credentials({
      id: 'booking-agent-activation',
      name: 'Approved booking-agent activation',
      credentials: { token: { label: 'Activation token', type: 'text' } },
      async authorize(credentials) {
        const token = String(credentials.token || '');
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;
        const user = await authenticateBookingAgentActivation(token);
        return user ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      return Boolean(profile?.email && profile.email_verified === true);
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "google" && profile?.email) {
        const stored = await upsertGoogleUser({
          providerAccountId: account.providerAccountId,
          email: profile.email,
          name: profile.name,
          image: typeof profile.picture === "string" ? profile.picture : null,
        });
        token.id = stored.id;
      } else if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = String(token.id ?? token.sub ?? "");
      return session;
    },
  },
});

export const signOutUrl = "/login";
