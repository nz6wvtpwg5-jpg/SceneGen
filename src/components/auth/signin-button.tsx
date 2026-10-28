'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SignInContent = () => {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      void router.push('/login')
    } else if (status === 'authenticated') {
      const callbackUrl = window.location.search.includes('callbackUrl=')
        ? decodeURIComponent(window.location.search.replace(/^\?callbackUrl=/, ''))
        : '/'
      void router.push(callbackUrl)
    }
  }, [status, router])

  return null
}

const SignIn = () => {
  return (
    <SessionProvider>
      <div
        style={{
          flex: 1,
          display: 'grid',
          placeContent: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        Signing in...
      </div>
      <SignInContent />
    </SessionProvider>
  )
}

export default SignIn
