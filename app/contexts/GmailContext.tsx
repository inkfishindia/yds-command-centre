import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react'
import { GmailMessage } from '../types' // Updated import path
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { listGmailMessages } from '../services/gmailService'
import { parseGmailMessages } from '../services/gmailParser'


interface GmailContextType {
  emails: GmailMessage[]
  loading: boolean
  error: string | null
  initialLoadComplete: boolean
  loadEmails: (forceRefresh?: boolean) => Promise<void>
}

const GmailContext = createContext<GmailContextType | undefined>(undefined)

export const GmailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth()
  const { addToast } = useToast()

  const [emails, setEmails] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const loadEmails = useCallback(async (forceRefresh = false) => {
    if (!isSignedIn) {
      setError("Please sign in to load emails.")
      setEmails([])
      return
    }
    if (initialLoadComplete && !forceRefresh) return

    setLoading(true)
    setError(null)

    try {
      const rawMessages = await listGmailMessages(10)
      const parsedEmails = parseGmailMessages(rawMessages)
      setEmails(parsedEmails)
      if (forceRefresh) addToast("Emails refreshed successfully! 📧", "success")
    } catch (err: any) {
      console.error("Failed to fetch Gmail emails:", err)
      const friendlyError = err.message || "Could not load emails. Please check permissions."
      setError(friendlyError)
      addToast(`Error loading emails: ${friendlyError}`, 'error')
    } finally {
      setInitialLoadComplete(true)
      setLoading(false)
    }
  }, [isSignedIn, addToast, initialLoadComplete])

  useEffect(() => {
    if (isSignedIn && !initialLoadComplete) {
      loadEmails()
    }
  }, [isSignedIn, initialLoadComplete, loadEmails])

  const value = {
    emails,
    loading,
    error,
    initialLoadComplete,
    loadEmails,
  }

  return (
    <GmailContext.Provider value={value}>
      {children}
    </GmailContext.Provider>
  )
}

export const useGmail = (): GmailContextType => {
  const context = useContext(GmailContext)
  if (context === undefined) {
    throw new Error('useGmail must be used within a GmailProvider')
  }
  return context
}