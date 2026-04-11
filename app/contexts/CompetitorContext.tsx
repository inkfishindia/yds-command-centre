import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { Competitor, CompetitorContextType } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getCompetitors, saveCompetitors, addCompetitor, updateCompetitor, deleteCompetitor, performSocialMediaSearch, saveCompetitorDataToDrive } from '../services/competitorService';
import { mockCompetitors, mockSocialSearchResult } from '../lib/mockData';

const CompetitorContext = createContext<CompetitorContextType | undefined>(undefined);

export const CompetitorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isMockMode, isSignedIn } = useAuth();
  const { addToast } = useToast();

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchingSocial, setIsSearchingSocial] = useState(false);
  const [socialSearchResult, setSocialSearchResult] = useState<string | null>(null);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);


  const loadCompetitors = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        setCompetitors(mockCompetitors);
      } else {
        const storedCompetitors = getCompetitors();
        setCompetitors(storedCompetitors);
      }
      if (forceRefresh) addToast('Competitors refreshed! ⚔️', 'success');
    } catch (err: any) {
      console.error('Failed to load competitors:', err);
      setError(err.message || 'Failed to load competitor profiles.');
      addToast(`Error loading competitors: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [isMockMode, addToast]);

  const handleAddCompetitor = useCallback(async (newCompetitor: Partial<Competitor>) => {
    try {
      if (isMockMode) {
        const addedComp: Competitor = {
          ...newCompetitor,
          id: `COMP-MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: newCompetitor.name || 'Untitled Mock Competitor',
        } as Competitor;
        setCompetitors(prev => [...prev, addedComp]);
      } else {
        const addedComp = addCompetitor(newCompetitor);
        setCompetitors(prev => [...prev, addedComp]);
      }
      addToast('Competitor added successfully! ✨', 'success');
    } catch (err: any) {
      console.error('Failed to add competitor:', err);
      addToast(`Error adding competitor: ${err.message}`, 'error');
    }
  }, [isMockMode, addToast]);

  const handleUpdateCompetitor = useCallback(async (updatedCompetitor: Competitor) => {
    try {
      if (isMockMode) {
        setCompetitors(prev => prev.map(c => (c.id === updatedCompetitor.id ? updatedCompetitor : c)));
      } else {
        updateCompetitor(updatedCompetitor);
        setCompetitors(prev => prev.map(c => (c.id === updatedCompetitor.id ? updatedCompetitor : c)));
      }
      addToast('Competitor updated successfully! ✏️', 'success');
    } catch (err: any) {
      console.error('Failed to update competitor:', err);
      addToast(`Error updating competitor: ${err.message}`, 'error');
    }
  }, [isMockMode, addToast]);

  const handleDeleteCompetitor = useCallback(async (id: string) => {
    try {
      if (isMockMode) {
        setCompetitors(prev => prev.filter(c => c.id !== id));
      } else {
        deleteCompetitor(id);
        setCompetitors(prev => prev.filter(c => c.id !== id));
      }
      addToast('Competitor deleted! 🗑️', 'info');
    } catch (err: any) {
      console.error('Failed to delete competitor:', err);
      addToast(`Error deleting competitor: ${err.message}`, 'error');
    }
  }, [isMockMode, addToast]);

  const handleSearchSocialMedia = useCallback(async (competitorName: string): Promise<string | null> => {
    if (!isSignedIn && !isMockMode) {
      addToast('Please sign in to use AI features.', 'error');
      return null;
    }
    setIsSearchingSocial(true);
    setSocialSearchResult(null);
    try {
      if (isMockMode) {
        setSocialSearchResult(mockSocialSearchResult);
        addToast(`Mock social search for ${competitorName} complete!`, 'success');
        return mockSocialSearchResult;
      } else {
        const result = await performSocialMediaSearch(competitorName);
        setSocialSearchResult(result);
        addToast(`Social search for ${competitorName} complete!`, 'success');
        return result;
      }
    } catch (err: any) {
      console.error('Failed to search social media:', err);
      addToast(`Error searching social media: ${err.message}`, 'error');
      setSocialSearchResult(null);
      return null;
    } finally {
      setIsSearchingSocial(false);
    }
  }, [isMockMode, isSignedIn, addToast]);

  const clearSocialSearchResult = useCallback(() => {
    setSocialSearchResult(null);
  }, []);

  const handleSaveCompetitorDataToDrive = useCallback(async (competitor: Competitor, searchResult: string) => {
    if (!isSignedIn) {
      addToast('Please sign in to save to Google Drive.', 'error');
      return;
    }
    setIsSavingToDrive(true);
    try {
      // In mock mode, just simulate the save operation
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        addToast(`Mock save for ${competitor.name} to Drive complete!`, 'success');
      } else {
        await saveCompetitorDataToDrive(competitor, searchResult);
        addToast(`Competitor data for ${competitor.name} saved to Drive! 💾`, 'success');
      }
    } catch (err: any) {
      console.error('Failed to save to Google Drive:', err);
      addToast(`Error saving to Drive: ${err.message}`, 'error');
    } finally {
      setIsSavingToDrive(false);
    }
  }, [isMockMode, isSignedIn, addToast]);


  useEffect(() => {
    loadCompetitors();
  }, [loadCompetitors]);

  const value = {
    competitors,
    loading,
    error,
    loadCompetitors,
    addCompetitor: handleAddCompetitor,
    updateCompetitor: handleUpdateCompetitor,
    deleteCompetitor: handleDeleteCompetitor,
    searchSocialMedia: handleSearchSocialMedia,
    isSearchingSocial,
    socialSearchResult,
    clearSocialSearchResult,
    isSavingToDrive,
    saveCompetitorToDrive: handleSaveCompetitorDataToDrive,
  };

  return (
    <CompetitorContext.Provider value={value}>
      {children}
    </CompetitorContext.Provider>
  );
};

export const useCompetitor = (): CompetitorContextType => {
  const context = useContext(CompetitorContext);
  if (context === undefined) {
    throw new Error('useCompetitor must be used within a CompetitorProvider');
  }
  return context;
};