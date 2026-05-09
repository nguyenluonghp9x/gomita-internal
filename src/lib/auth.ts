import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { writeAuditLog } from "@/lib/audit/audit-log";
import { consumeLoginAttempt, loginRateLimitKey, resetLoginAttempts } from "@/lib/rate-limit/login-attempts";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const sessionMaxAge = Number(process.env.SESSION_MAX_AGE_SECONDS ?? 60 * 60 * 8);
const sessionUpdateAge = Number(process.env.SESSION_UPDATE_AGE_SECONDS ?? 60 * 5);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: sessionMaxAge,
    updateAge: sessionUpdateAge,
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const rateKey = loginRateLimitKey(parsed.data.email);
        const gate = await consumeLoginAttempt(rateKey);
        if (!gate.ok) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: {
            roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          },
        });
        if (!user?.passwordHash || !user.isActive) return null;

        const ok = await compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        resetLoginAttempts(rateKey);

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string);
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (user?.id) {
        await writeAuditLog({
          actorId: user.id,
          action: "LOGIN",
          module: "auth",
          resource: "session",
          metadata: { provider: account?.provider ?? "credentials" },
        });
      }
    },
  },
};
