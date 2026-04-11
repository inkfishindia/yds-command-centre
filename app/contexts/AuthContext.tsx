
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react'
import { UserProfile, AuthContextType } from '../types'
import { useToast } from './ToastContext'
import { requestAllGoogleApiTokens, revokeToken } from '../lib/googleAuth'
import { dataClient } from '../lib/dataClient'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = 'yds_erp_session_v1';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; 

interface Session {
  userProfile: UserProfile;
  expiresAt: number;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gsiInitialized, setGsiInitialized] = useState(false);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);
  const [isAuthActionInProgress, setIsAuthActionInProgress] = useState(false);
  const { addToast } = useToast();
  const refreshIntervalRef = useRef<number | null>(null);

  const saveSession = useCallback((profile: UserProfile) => {
    const session: Session = {
      userProfile: profile,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  const hydrateFromSession = useCallback((session: Session) => {
    setUserProfile(session.userProfile);
    setIsSignedIn(true);
  }, []);
  
  const signOut = useCallback(async () => {
    setIsAuthActionInProgress(true);
    try {
      await revokeToken();
    } catch (error: any) {
      console.error("Token revocation failed:", error);
    } finally {
      clearSession();
      dataClient.clearCache();
      setIsSignedIn(false);
      setUserProfile(null);
      setIsAuthActionInProgress(false);
      addToast("Successfully signed out.", "info");
      // Notify other tabs
      window.dispatchEvent(new StorageEvent('storage', { 
        key: SESSION_KEY, 
        newValue: null 
      }));
    }
  }, [addToast, clearSession]);

  const startTokenRefreshTimer = useCallback(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    // Refresh token every 50 minutes
    refreshIntervalRef.current = window.setInterval(async () => {
      try {
        await requestAllGoogleApiTokens({ prompt: 'none' });
        console.debug("Background token refresh successful.");
      } catch (e) {
        console.debug("Periodic refresh failed (likely cookie policy).");
      }
    }, 50 * 60 * 1000);
  }, []);

  const signIn = useCallback(async () => {
    if (!gsiInitialized) {
      addToast("Auth service not ready. Please wait a moment.", "info");
      return;
    }
    setIsAuthActionInProgress(true);
    try {
      const accessToken = await requestAllGoogleApiTokens({ prompt: 'consent' });
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userInfoRes.ok) throw new Error("UserInfo verification failed.");
      const userInfo = await userInfoRes.json();
      
      const profile: UserProfile = {
        id: userInfo.sub,
        fullName: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
      };
      
      setUserProfile(profile);
      setIsSignedIn(true);
      saveSession(profile);
      startTokenRefreshTimer();
      addToast(`Welcome, ${profile.fullName}!`, "success");
      
      window.dispatchEvent(new StorageEvent('storage', { 
        key: SESSION_KEY, 
        newValue: localStorage.getItem(SESSION_KEY) 
      }));
    } catch (error: any) {
      console.error("Sign-In failed:", error);
      addToast("Sign-in cancelled or failed.", "error");
    } finally {
      setIsAuthActionInProgress(false);
    }
  }, [gsiInitialized, addToast, saveSession, startTokenRefreshTimer]);

  const checkExistingSession = useCallback(async () => {
    const rawSession = localStorage.getItem(SESSION_KEY);
    if (!rawSession) {
      setInitialAuthCheckComplete(true);
      return;
    }

    try {
      const session: Session = JSON.parse(rawSession);
      if (Date.now() > session.expiresAt) {
        clearSession();
        setInitialAuthCheckComplete(true);
        return;
      }

      // Pre-emptively request a token before completing initialization
      try {
        await requestAllGoogleApiTokens({ prompt: 'none' });
        hydrateFromSession(session);
        startTokenRefreshTimer();
      } catch (refreshError) {
        console.debug("Silent refresh failed on start. Clearing session.");
        clearSession();
      }
    } catch (e) {
      console.error("Session restoration error:", e);
      clearSession();
    } finally {
      setInitialAuthCheckComplete(true);
    }
  }, [clearSession, hydrateFromSession, startTokenRefreshTimer]);

  useEffect(() => {
    const checkGsi = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(checkGsi);
        setGsiInitialized(true);
        checkExistingSession();
      }
    }, 100);
    return () => clearInterval(checkGsi);
  }, [checkExistingSession]);

  useEffect(() => {
    const handleSync = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        if (!e.newValue) {
          setIsSignedIn(false);
          setUserProfile(null);
        } else {
          try {
            const session: Session = JSON.parse(e.newValue);
            hydrateFromSession(session);
          } catch (err) {
            console.error("Sync hydration error:", err);
          }
        }
      }
    };
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [hydrateFromSession]);

  const refreshAuthToken = useCallback(async (scopes?: string | string[]) => {
    return await requestAllGoogleApiTokens({ prompt: 'none' }, scopes);
  }, []);

  const isMockMode = useMemo(() => initialAuthCheckComplete && !isSignedIn, [initialAuthCheckComplete, isSignedIn]);

  const value = useMemo(() => ({
    isSignedIn,
    isMockMode,
    userProfile,
    gsiInitialized,
    initialAuthCheckComplete,
    isAuthActionInProgress,
    signIn,
    signOut,
    refreshAuthToken,
  }), [isSignedIn, isMockMode, userProfile, gsiInitialized, initialAuthCheckComplete, isAuthActionInProgress, signIn, signOut, refreshAuthToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
