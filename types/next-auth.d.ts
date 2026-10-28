import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      given_name?: string
      family_name?: string
      jobTitle?: string
    } & DefaultSession['user']
    error?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    name: string
    email?: string
    picture?: string
    error?: string
    given_name?: string
    family_name?: string
    jobTitle?: string
  }
}
