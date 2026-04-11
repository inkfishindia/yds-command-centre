// pages/ai_studio/VideoGeneratorPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Button, Input, Select, EmptyState, Modal, ManagerEditorLayout, FileUpload } from '../../ui'; // Changed Page, Card, Button, Input, Select, EmptyState, Modal, FileUpload
import { useAuth } from '../../contexts/AuthContext';
import { useAITools } from '../../contexts/AIToolsContext';
import DemoModeBanner from '../../components/layout/DemoModeBanner';

// Component to gate access to Veo features until API key is selected
interface ApiKeySelectionGateProps {
  children: React.ReactNode;
}

const ApiKeySelectionGate: React.FC<ApiKeySelectionGateProps> = ({ children }) => {
  const { isSignedIn } = useAuth();
  const { hasVeoApiKey, requestVeoApiKeySelection, veoApiKeyPromptOpen, setVeoApiKeyPromptOpen } = useAITools();

  const handleOpenSelectKey = useCallback(async () => {
    // This will trigger window.aistudio.openSelectKey() via context
    await requestVeoApiKeySelection();
    setVeoApiKeyPromptOpen(false); // Close the modal once the user clicks to open the GSI dialog
  }, [requestVeoApiKeySelection, setVeoApiKeyPromptOpen]);

  if (!isSignedIn) {
    return (
      <EmptyState
        title="Sign In Required"
        description="Please sign in with Google to access video generation features."
        action={<Button variant="accent">Sign In</Button>}
      />
    );
  }

  if (!hasVeoApiKey) {
    return (
      <>
        <EmptyState
          title="Veo API Key Not Selected"
          description="To use the AI Video Generator, you need to select a Google AI Studio API key. Billing is associated with your selected key."
          action={
            <Button variant="accent" onClick={handleOpenSelectKey}>
              Select API Key 🔑
            </Button>
          }
        />
        <Modal
          open={veoApiKeyPromptOpen}
          onClose={() => setVeoApiKeyPromptOpen(false)} // Allow user to close if they want
          title="Select AI Studio API Key"
          className="max-w-md"
        >
          <p className="mb-4 text-[var(--color-text-secondary)]">
            Before generating videos, you need to select an API Key in Google AI Studio.
            This action will open a pop-up for you to choose your key.
            <br /><br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">
              Billing information for Gemini API
            </a>
          </p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleOpenSelectKey}>Open Key Selector</Button>
          </div>
        </Modal>
      </>
    );
  }

  return <>{children}</>;
};

const VideoGeneratorPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    generatedVideos, generatingVideo, videoAIError,
    generateVideo, clearVideoResults,
  } = useAITools();

  const [prompt, setPrompt] = useState('');
  const [startImageFile, setStartImageFile] = useState<File | null>(null);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const resolutionOptions = useMemo(() => [
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
  ], []);

  const aspectRatioOptions = useMemo(() => [
    { value: '16:9', label: '16:9 (Landscape)' },
    { value: '9:16', label: '9:16 (Portrait)' },
  ], []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt for video generation.');
      return;
    }
    await generateVideo(prompt, startImageFile, resolution, aspectRatio);
  }, [prompt, startImageFile, resolution, aspectRatio, generateVideo]);

  const handleClear = useCallback(() => {
    setPrompt('');
    setStartImageFile(null);
    setResolution('720p');
    setAspectRatio('16:9');
    clearVideoResults();
  }, [clearVideoResults]);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Video Generator">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to use the AI Video Generator"
            description="Connect your Google account to create videos with AI."
            action={
              <Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>
                {isAuthActionInProgress ? 'Loading...' : 'Sign in with Google 🚀'}
              </Button>
            }
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title="Video Generator">
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Generate dynamic videos from text prompts and optional starting images. Video generation can take a few minutes.
      </p>

      <ApiKeySelectionGate>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input/Controls Card */}
          <Card title="Inputs" className="h-fit">
            <div className="space-y-4">
              <Input
                label="Prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g., A neon hologram of a cat driving at top speed"
                required
              />
              <FileUpload
                label="Starting Image (Optional)"
                onFileSelect={setStartImageFile}
                selectedFile={startImageFile}
                acceptedFileTypes="image/*"
              />
              <Select
                label="Resolution"
                options={resolutionOptions}
                value={resolution}
                onChange={value => setResolution(value as '720p' | '1080p')}
              />
              <Select
                label="Aspect Ratio"
                options={aspectRatioOptions}
                value={aspectRatio}
                onChange={value => setAspectRatio(value as '16:9' | '9:16')}
              />
              <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={handleClear} disabled={generatingVideo}>Clear All</Button>
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={generatingVideo || !prompt.trim()}
                >
                  {generatingVideo ? 'Generating...' : <><span role="img" aria-label="sparkles" className="mr-2">✨</span> Generate Video</>}
                </Button>
              </div>
            </div>
          </Card>

          {/* Output Card */}
          <Card title="AI Generated Video" className="h-full">
            {generatingVideo && (
              <div className="text-center py-10 text-[var(--color-text-secondary)]">
                <p>Generating your video...</p>
                <p className="mt-2">This can take a few minutes. Please wait.</p>
                <p className="mt-4 text-4xl animate-bounce">🎬</p>
              </div>
            )}
            {videoAIError && <EmptyState title="Error" description={videoAIError} action={<Button onClick={handleGenerate}>Retry</Button>} />}
            {generatedVideos.length > 0 ? (
              <div className="space-y-4">
                {generatedVideos.map((video) => (
                  <div key={video.id} className="border border-[var(--color-border-primary)] rounded-md overflow-hidden bg-[var(--color-bg-stage)]">
                    {/* Assuming a simple video player or direct link */}
                    <video controls src={video.videoUrl} className="w-full h-auto object-contain max-h-96 bg-black" />
                    <div className="p-3 text-sm text-[var(--color-text-secondary)]">
                      <p className="font-semibold text-[var(--color-text-primary)]">Prompt:</p>
                      <p>{video.prompt}</p>
                      <p className="mt-1">Resolution: {video.resolution}</p>
                      <p>Aspect Ratio: {video.aspectRatio}</p>
                      {video.videoUrl && (
                        <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline mt-2 inline-block">
                          Download Video 🔗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !generatingVideo && !videoAIError && <EmptyState title="No Video Generated" description="Enter a prompt and click 'Generate Video'." />
            )}
          </Card>
        </div>
      </ApiKeySelectionGate>
    </ManagerEditorLayout>
  );
};

export default VideoGeneratorPage;