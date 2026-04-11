import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect, useRef } from 'react';
import {
  AIToolsContextType, BrandProfile, CustomerPsychologyOutput, ContentStrategyOutput, CampaignIdea, BlogPostOutput,
  GeneratedImage, GeneratedVideo,
} from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  generateCustomerPsychology as callGenerateCustomerPsychology,
  generateContentStrategy as callGenerateContentStrategy,
  generateCampaignIdeas as callGenerateCampaignIdeas,
  generateBlogPost as callGenerateBlogPost,
  generateImage as callGenerateImage,
  editImage as callEditImage,
  generateVideo as callGenerateVideo,
} from '../services/aiGenerativeService';
import {
  mockCustomerPsychology, mockContentStrategy, mockCampaignIdeas, mockBlogPost,
  mockGeneratedImage, mockGeneratedVideo,
} from '../lib/mockData';
// Removed: import { GoogleGenerateVideoImageInput } from '@google/genai'; // FIX: Removed the deprecated import 'GoogleGenerateVideoImageInput'.
// The payload for generateVideo is constructed using inline types or File objects.

const AIToolsContext = createContext<AIToolsContextType | undefined>(undefined);

export const AIToolsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isMockMode, isSignedIn } = useAuth();
  const { addToast } = useToast();

  // Text Generators
  const [customerPsychology, setCustomerPsychology] = useState<CustomerPsychologyOutput | null>(null);
  const [contentStrategy, setContentStrategy] = useState<ContentStrategyOutput | null>(null);
  const [campaignIdeas, setCampaignIdeas] = useState<CampaignIdea[] | null>(null);
  const [blogPost, setBlogPost] = useState<BlogPostOutput | null>(null);
  const [loadingTextAI, setLoadingTextAI] = useState(false);
  const [textAIError, setTextAIError] = useState<string | null>(null);

  // Image Designer
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageAIError, setImageAIError] = useState<string | null>(null);

  // Video Generator
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoAIError, setVideoAIError] = useState<string | null>(null);
  const [hasVeoApiKey, setHasVeoApiKey] = useState(false);
  const [veoApiKeyPromptOpen, setVeoApiKeyPromptOpen] = useState(false);

  const checkVeoApiKeyRef = useRef<(() => Promise<boolean>) | null>(null);
  const openVeoApiKeySelectionRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize window.aistudio functions
  useEffect(() => {
    const initAistudio = () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey && window.aistudio.openSelectKey) {
        checkVeoApiKeyRef.current = window.aistudio.hasSelectedApiKey;
        openVeoApiKeySelectionRef.current = window.aistudio.openSelectKey;
        // Check API key status on load
        window.aistudio.hasSelectedApiKey().then(setHasVeoApiKey);
      }
    };

    // Check immediately and then every second until loaded
    const interval = setInterval(() => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        clearInterval(interval);
        initAistudio();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // --- Text AI Functions ---
  const generateCustomerPsychology = useCallback(async (brand: BrandProfile, marketingGoal: string) => {
    if (!isSignedIn && !isMockMode) {
      addToast('Please sign in to use AI features.', 'error');
      return;
    }
    setLoadingTextAI(true);
    setTextAIError(null);
    setCustomerPsychology(null);
    try {
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
        setCustomerPsychology({ ...mockCustomerPsychology, brandId: brand.id, marketingGoal });
      } else {
        const result = await callGenerateCustomerPsychology(brand, marketingGoal);
        setCustomerPsychology(result);
      }
      addToast('Customer psychology generated! 🧠', 'success');
    } catch (err: any) {
      console.error('Customer psychology generation failed:', err);
      setTextAIError(err.message || 'Failed to generate customer psychology.');
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingTextAI(false);
    }
  }, [isMockMode, isSignedIn, addToast]);

  const generateContentStrategy = useCallback(async (brief: string, audience: string) => {
    if (!isSignedIn && !isMockMode) {
      addToast('Please sign in to use AI features.', 'error');
      return;
    }
    setLoadingTextAI(true);
    setTextAIError(null);
    setContentStrategy(null);
    try {
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setContentStrategy({ ...mockContentStrategy, campaignBrief: brief, targetAudienceDescription: audience });
      } else {
        const result = await callGenerateContentStrategy(brief, audience);
        setContentStrategy(result);
      }
      addToast('Content strategy generated! 📝', 'success');
    } catch (err: any) {
      console.error('Content strategy generation failed:', err);
      setTextAIError(err.message || 'Failed to generate content strategy.');
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingTextAI(false);
    }
  }, [isMockMode, isSignedIn, addToast]);

  const generateCampaignIdeas = useCallback(async (productService: string): Promise<CampaignIdea[] | undefined> => {
    if (!isSignedIn && !isMockMode) {
      addToast('Please sign in to use AI features.', 'error');
      return;
    }
    setLoadingTextAI(true);
    setTextAIError(null);
    setCampaignIdeas(null);
    try {
      let result: CampaignIdea[];
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 1800));
        result = mockCampaignIdeas.map(idea => ({ ...idea, productService }));
      } else {
        result = await callGenerateCampaignIdeas(productService);
      }
      setCampaignIdeas(result);
      addToast('Campaign ideas generated! 💡', 'success');
      return result;
    } catch (err: any) {
      console.error('Campaign ideas generation failed:', err);
      setTextAIError(err.message || 'Failed to generate campaign ideas.');
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingTextAI(false);
    }
  }, [isMockMode, isSignedIn, addToast]);

  const generateBlogPost = useCallback(async (topic: string) => {
    if (!isSignedIn && !isMockMode) {
      addToast('Please sign in to use AI features.', 'error');
      return;
    }
    setLoadingTextAI(true);
    setTextAIError(null);
    setBlogPost(null);
    try {
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        setBlogPost({ ...mockBlogPost, topic });
      } else {
        const result = await callGenerateBlogPost(topic);
        setBlogPost(result);
      }
      addToast('Blog post generated! ✍️', 'success');
    } catch (err: any) {
      console.error('Blog post generation failed:', err);
      setTextAIError(err.message || 'Failed to generate blog post.');
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingTextAI(false);
    }
  }, [isMockMode, isSignedIn, addToast]);

  const clearTextAIResults = useCallback(() => {
    setCustomerPsychology(null);
    setContentStrategy(null);
    setCampaignIdeas(null);
    setBlogPost(null);
    setTextAIError(null);
  }, []);

  // --- Image AI Functions ---
  const generateImage = useCallback(async (prompt: string, aspectRatio?: string) => {
    if (!isSignedIn && !isMockMode) {
      addToast('Please sign in to use AI features.', 'error');
      return;
    }
    setGeneratingImage(true);
    setImageAIError(null);
    try {
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setGeneratedImages([mockGeneratedImage]);
      } else {
        const result = await callGenerateImage(prompt, aspectRatio);
        setGeneratedImages([result]);
      }
      addToast('Image generated! 🖼️', 'success');
    } catch (err: any) {
      console.error('Image generation failed:', err);
      setImageAIError(err.message || 'Failed to generate image.');
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setGeneratingImage(false);
    }
  }, [isMockMode, isSignedIn, addToast]);

  const editImage = useCallback(async (sourceImageBase64: string, sourceMimeType: string, prompt: string) => {
    if (!isSignedIn && !isMockMode) {
      addToast('Please sign in to use AI features.', 'error');
      return;
    }
    setGeneratingImage(true);
    setImageAIError(null);
    try {
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        setGeneratedImages([mockGeneratedImage]); // Mock editing with a new image
      } else {
        const result = await callEditImage(sourceImageBase64, sourceMimeType, prompt);
        setGeneratedImages([result]);
      }
      addToast('Image edited! 🖼️', 'success');
    } catch (err: any) {
      console.error('Image editing failed:', err);
      setImageAIError(err.message || 'Failed to edit image.');
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setGeneratingImage(false);
    }
  }, [isMockMode, isSignedIn, addToast]);

  const clearImageResults = useCallback(() => {
    setGeneratedImages([]);
    setImageAIError(null);
  }, []);

  // --- Video AI Functions ---
  const requestVeoApiKeySelection = useCallback(async (): Promise<boolean> => {
    if (isMockMode) {
      setHasVeoApiKey(true); // Always mock success for key selection
      return true;
    }

    if (!isSignedIn) {
      addToast('Please sign in to select an API Key.', 'error');
      return false;
    }

    if (checkVeoApiKeyRef.current && openVeoApiKeySelectionRef.current) {
      const hasKey = await checkVeoApiKeyRef.current();
      if (!hasKey) {
        setVeoApiKeyPromptOpen(true); // Indicate that the dialog is open
        await openVeoApiKeySelectionRef.current();
        // Assume success after opening dialog, will be verified on actual API call
        setHasVeoApiKey(true);
        addToast('Please make sure to select an API key in the pop-up.', 'info');
        return true;
      }
      setHasVeoApiKey(true);
      return true;
    }
    addToast('Google AI Studio API Key selection service not available.', 'error');
    return false;
  }, [isMockMode, isSignedIn, addToast]);


  const generateVideo = useCallback(async (prompt: string, startImageFile?: File, resolution?: string, aspectRatio?: string) => {
    if (!isMockMode && !hasVeoApiKey) {
      addToast('Please select your API Key for video generation first. 🔑', 'error');
      return;
    }
    if (!isSignedIn && !isMockMode) {
      addToast('Please sign in to use AI features.', 'error');
      return;
    }

    setGeneratingVideo(true);
    setVideoAIError(null);
    try {
      if (isMockMode) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate long API call
        setGeneratedVideos([mockGeneratedVideo]);
      } else {
        const result = await callGenerateVideo(
          prompt,
          startImageFile,
          resolution as '720p' | '1080p', // Type assertion
          aspectRatio as '16:9' | '9:16', // Type assertion
        );
        setGeneratedVideos([result]);
      }
      addToast('Video generation started. This may take a few minutes... 🎥', 'info');
    } catch (err: any) {
      console.error('Video generation failed:', err);
      // Special handling for "Requested entity was not found." - usually indicates API key issue
      if (err.message.includes("Requested entity was not found.")) {
        setHasVeoApiKey(false); // Reset key status
        setVeoApiKeyPromptOpen(true); // Prompt user to re-select key
        setVideoAIError("Your API Key might be invalid or expired. Please re-select it.");
        addToast("Your API Key might be invalid or expired. Please re-select it.", 'error');
      } else {
        setVideoAIError(err.message || 'Failed to generate video.');
        addToast(`Error: ${err.message}`, 'error');
      }
    } finally {
      setGeneratingVideo(false);
    }
  }, [isMockMode, isSignedIn, hasVeoApiKey, addToast]);

  const clearVideoResults = useCallback(() => {
    setGeneratedVideos([]);
    setVideoAIError(null);
  }, []);

  const value = {
    customerPsychology,
    contentStrategy,
    campaignIdeas,
    blogPost,
    loadingTextAI,
    textAIError,
    generateCustomerPsychology,
    generateContentStrategy,
    generateCampaignIdeas,
    generateBlogPost,
    clearTextAIResults,

    generatedImages,
    generatingImage,
    imageAIError,
    generateImage,
    editImage,
    clearImageResults,

    generatedVideos,
    generatingVideo,
    videoAIError,
    generateVideo,
    hasVeoApiKey,
    requestVeoApiKeySelection,
    veoApiKeyPromptOpen,
    setVeoApiKeyPromptOpen,
    clearVideoResults,
  };

  return (
    <AIToolsContext.Provider value={value}>
      {children}
    </AIToolsContext.Provider>
  );
};

export const useAITools = (): AIToolsContextType => {
  const context = useContext(AIToolsContext);
  if (context === undefined) {
    throw new Error('useAITools must be used within an AIToolsProvider');
  }
  return context;
};