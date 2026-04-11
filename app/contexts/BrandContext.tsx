import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { BrandProfile, BrandContextType } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getBrands, saveBrands, addBrand, updateBrand, deleteBrand } from '../services/brandService';
import { mockBrands } from '../lib/mockData';

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isMockMode } = useAuth();
  const { addToast } = useToast();

  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBrands = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        setBrands(mockBrands);
      } else {
        const storedBrands = getBrands();
        setBrands(storedBrands);
      }
      if (forceRefresh) addToast('Brands refreshed! 🎨', 'success');
    } catch (err: any) {
      console.error('Failed to load brands:', err);
      setError(err.message || 'Failed to load brand profiles.');
      addToast(`Error loading brands: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [isMockMode, addToast]);

  const handleAddBrand = useCallback(async (newBrand: Partial<BrandProfile>) => {
    try {
      if (isMockMode) {
        // In mock mode, just simulate addition
        const addedBrand: BrandProfile = {
          ...newBrand,
          id: `BRAND-MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: newBrand.name || 'Untitled Mock Brand',
          voice: newBrand.voice || 'Neutral',
          mission: newBrand.mission || 'No mission defined',
        } as BrandProfile;
        setBrands(prev => [...prev, addedBrand]);
      } else {
        const addedBrand = addBrand(newBrand);
        setBrands(prev => [...prev, addedBrand]);
      }
      addToast('Brand added successfully! ✨', 'success');
    } catch (err: any) {
      console.error('Failed to add brand:', err);
      addToast(`Error adding brand: ${err.message}`, 'error');
    }
  }, [isMockMode, addToast]);

  const handleUpdateBrand = useCallback(async (updatedBrand: BrandProfile) => {
    try {
      if (isMockMode) {
        setBrands(prev => prev.map(b => (b.id === updatedBrand.id ? updatedBrand : b)));
      } else {
        updateBrand(updatedBrand);
        setBrands(prev => prev.map(b => (b.id === updatedBrand.id ? updatedBrand : b)));
      }
      addToast('Brand updated successfully! ✏️', 'success');
    } catch (err: any) {
      console.error('Failed to update brand:', err);
      addToast(`Error updating brand: ${err.message}`, 'error');
    }
  }, [isMockMode, addToast]);

  const handleDeleteBrand = useCallback(async (id: string) => {
    try {
      if (isMockMode) {
        setBrands(prev => prev.filter(b => b.id !== id));
      } else {
        deleteBrand(id);
        setBrands(prev => prev.filter(b => b.id !== id));
      }
      addToast('Brand deleted! 🗑️', 'info');
    } catch (err: any) {
      console.error('Failed to delete brand:', err);
      addToast(`Error deleting brand: ${err.message}`, 'error');
    }
  }, [isMockMode, addToast]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const value = {
    brands,
    loading,
    error,
    loadBrands,
    addBrand: handleAddBrand,
    updateBrand: handleUpdateBrand,
    deleteBrand: handleDeleteBrand,
  };

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};