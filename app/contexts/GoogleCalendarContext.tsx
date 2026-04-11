import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react'
import { GoogleCalendarEvent } from '../types'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { listCalendarEvents } from '../services/calendarService'
import { parseCalendarEvents } from '../services/calendarParser'


interface GoogleCalendarContextType {
  events: GoogleCalendarEvent[]
  loading: boolean
  error: string | null
  initialLoadComplete: boolean
  loadEvents: (forceRefresh?: boolean) => Promise<void>
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined)

export const GoogleCalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth()
  const { addToast } = useToast()

  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const loadEvents = useCallback(async (forceRefresh = false) => {
    if (!isSignedIn) {
      setError("Please sign in to load calendar events.")
      setEvents([])
      return
    }
    if (initialLoadComplete && !forceRefresh) return

    setLoading(true)
    setError(null)

    try {
      const rawEvents = await listCalendarEvents(15)
      const parsedEvents = parseCalendarEvents(rawEvents)
      setEvents(parsedEvents)
      if (forceRefresh) addToast("Calendar events refreshed! 🗓️", "success")
    } catch (err: any) {
      console.error("Failed to fetch Google Calendar events:", err)
      const friendlyError = err.message || "Could not load events. Please check permissions."
      setError(friendlyError)
      addToast(`Error loading calendar events: ${friendlyError}`, 'error')
    } finally {
      setInitialLoadComplete(true)
      setLoading(false)
    }
  }, [isSignedIn, addToast, initialLoadComplete])

  useEffect(() => {
    if (isSignedIn && !initialLoadComplete) {
      loadEvents()
    }
  }, [isSignedIn, initialLoadComplete, loadEvents])

  const value = {
    events,
    loading,
    error,
    initialLoadComplete,
    loadEvents,
  }

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  )
}

export const useGoogleCalendar = (): GoogleCalendarContextType => {
  const context = useContext(GoogleCalendarContext)
  if (context === undefined) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider')
  }
  return context
}
