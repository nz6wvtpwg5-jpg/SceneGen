'use client'

import { SessionProvider, signOut, useSession } from 'next-auth/react'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { b2CCallbackQueryParam, useSignoutUrl } from '@/hooks/use-signout-url'

import { Button } from '@/components/ui/button'
import { sitemap } from '@/lib/utils/sitemap'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type AuthenticatedSignOutContentProps = {
  loginOutMessage: string
}

const AuthenticatedSignOutContent = (props: AuthenticatedSignOutContentProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { url, clearUrlParams } = useSignoutUrl()

  useEffect(() => {
    const b2cCallbackParam = searchParams.get(b2CCallbackQueryParam)

    if (url && !b2cCallbackParam) {
      router.push(`${url}&post_logout_redirect_uri=${origin}${sitemap.signout}?${b2CCallbackQueryParam}=true`)
      return
    }

    if (b2cCallbackParam && JSON.parse(b2cCallbackParam ?? 'false')) {
      void signOut({ redirect: false }).then(() => {
        void clearUrlParams()
      })
    }
  }, [searchParams, router, url, clearUrlParams])

  return (
    <>
      <div className='grid gap-5 text-center'>
        <p>{props.loginOutMessage}</p>
        <LoadingSpinner className='mx-auto' />
      </div>
    </>
  )
}

type SingnOutContentProps = {
  messages: {
    login: string
    logOutMessage: string
    logingOutMessage: string
  }
}

const SignOutContent = (props: SingnOutContentProps) => {
  const { status } = useSession()
  const { messages } = props
  return (
    <div className=' text-center grid gap-5 justify-items-center'>
      {status === 'unauthenticated' ? (
        <>
          <p>{messages.logOutMessage}</p>
          <Button asChild><Link href={sitemap.signin}>{messages.login}</Link></Button>
        </>
      ) : (
        <>
          <Suspense>
            <AuthenticatedSignOutContent loginOutMessage={messages.logingOutMessage} />
          </Suspense>
        </>
      )}
    </div>
  )
}

const SignOut = () => {
  return (
    <SessionProvider>
      <SignOutContent
        messages={{
          login: 'Sign in',
          logOutMessage: 'You are logged out.',
          logingOutMessage: 'Logging out...',
        }}
      />
    </SessionProvider>
  )
}

export default SignOut
