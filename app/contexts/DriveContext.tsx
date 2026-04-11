import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react'
import { GoogleDriveFile } from '../types' // Updated import path
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { listDriveFiles } from '../services/driveService'
import { parseDriveFiles } from '../services/driveParser'

interface DriveContextType {
  files: GoogleDriveFile[]
  loading: boolean
  error: string | null
  initialLoadComplete: boolean
  loadFiles: (forceRefresh?: boolean) => Promise<void>
}

const DriveContext = createContext<DriveContextType | undefined>(undefined)

export const DriveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth()
  const { addToast } = useToast()

  const [files, setFiles] = useState<GoogleDriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const loadFiles = useCallback(async (forceRefresh = false) => {
    if (!isSignedIn) {
      setError("Please sign in to load Drive files.")
      setFiles([])
      return
    }
    if (initialLoadComplete && !forceRefresh) return

    setLoading(true)
    setError(null)

    try {
      const rawFiles = await listDriveFiles(15)
      const parsedFiles = parseDriveFiles(rawFiles)
      setFiles(parsedFiles)
      if (forceRefresh) addToast("Drive files refreshed successfully! 📂", "success")
    } catch (err: any) {
      console.error("Failed to fetch Google Drive files:", err)
      const friendlyError = err.message || "Could not load files. Please check permissions."
      setError(friendlyError)
      addToast(`Error loading drive files: ${friendlyError}`, 'error')
    } finally {
      setInitialLoadComplete(true)
      setLoading(false)
    }
  }, [isSignedIn, addToast, initialLoadComplete])

  useEffect(() => {
    if (isSignedIn && !initialLoadComplete) {
      loadFiles()
    }
  }, [isSignedIn, initialLoadComplete, loadFiles])

  const value = {
    files,
    loading,
    error,
    initialLoadComplete,
    loadFiles,
  }

  return (
    <DriveContext.Provider value={value}>
      {children}
    </DriveContext.Provider>
  )
}

export const useDrive = (): DriveContextType => {
  const context = useContext(DriveContext)
  if (context === undefined) {
    throw new Error('useDrive must be used within a DriveProvider')
  }
  return context
}