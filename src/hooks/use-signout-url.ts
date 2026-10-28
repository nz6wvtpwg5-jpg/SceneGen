import { useEffect, useState } from 'react'

export const b2CCallbackQueryParam = 'oidcSignedOut'

export const useSignoutUrl = () => {
  const [url, setUrl] = useState(String())
  const [loading, setLoading] = useState(false)

  const fetchSignoutUrl = async () => {
    setLoading(true)
    const response = await fetch('/api/auth/b2c/signout')
    const result = await response.json()
    setUrl(result.signoutUrl)
    setLoading(false)
  }

  const clearUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.delete(b2CCallbackQueryParam)
    window.history.replaceState({}, '', `?${urlParams.toString()}`)
  }

  useEffect(() => {
    fetchSignoutUrl()
  }, [fetchSignoutUrl])

  return { url, loading, clearUrlParams }
}
