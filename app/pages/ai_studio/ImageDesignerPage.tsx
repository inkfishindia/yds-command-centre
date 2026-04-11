// pages/ai_studio/ImageDesignerPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, Select, EmptyState, ManagerEditorLayout, FileUpload } from '../../ui'; // Changed Page, Card, Button, Input, Select, EmptyState, FileUpload
import { useAuth } from '../../contexts/AuthContext';
import { useAITools } from '../../contexts/AIToolsContext';
import DemoModeBanner from '../../components/layout/DemoModeBanner';

const ImageDesignerPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    generatedImages, generatingImage, imageAIError,
    generateImage, editImage, clearImageResults,
  } = useAITools();

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);

  const aspectRatioOptions = useMemo(() => [
    { value: '1:1', label: '1:1 (Square)' },
    { value: '4:3', label: '4:3 (Landscape)' },
    { value: '3:4', label: '3:4 (Portrait)' },
    { value: '16:9', label: '16:9 (Widescreen)' },
    { value: '9:16', label: '9:16 (Tall)' },
  ], []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt for image generation.');
      return;
    }
    await generateImage(prompt, aspectRatio);
  }, [prompt, aspectRatio, generateImage]);

  const handleEdit = useCallback(async () => {
    if (!sourceImageFile) {
      alert('Please upload a source image for editing.');
      return;
    }
    if (!prompt.trim()) {
      alert('Please enter an editing prompt.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1]; // Get base64 part
        await editImage(base64Data, sourceImageFile.type, prompt);
      }
    };
    reader.readAsDataURL(sourceImageFile);
  }, [sourceImageFile, prompt, editImage]);


  const handleClear = useCallback(() => {
    setPrompt('');
    setAspectRatio('1:1');
    setSourceImageFile(null);
    clearImageResults();
  }, [clearImageResults]);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Image Designer">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to use the AI Image Designer"
            description="Connect your Google account to generate and edit images with AI."
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
    <ManagerEditorLayout title="Image Designer">
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Generate new images from text prompts or edit existing images with AI.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input/Controls Card */}
        <Card title="Inputs" className="h-fit">
          <div className="space-y-4">
            <FileUpload
              label="Source Image (Optional for editing)"
              onFileSelect={setSourceImageFile}
              selectedFile={sourceImageFile}
              acceptedFileTypes="image/*"
            />
            <Input
              label="Prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={sourceImageFile ? 'e.g., Add a hat to the cat' : 'e.g., A robot holding a red skateboard in a futuristic city'}
              required
            />
            {!sourceImageFile && (
              <Select
                label="Aspect Ratio (for generation)"
                options={aspectRatioOptions}
                value={aspectRatio}
                onChange={setAspectRatio}
              />
            )}
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={handleClear} disabled={generatingImage}>Clear All</Button>
              <Button
                variant="primary"
                onClick={sourceImageFile ? handleEdit : handleGenerate}
                disabled={generatingImage || !prompt.trim() || (sourceImageFile && !sourceImageFile.type.startsWith('image/'))}
              >
                {generatingImage ? 'Processing...' : (sourceImageFile ? <><span role="img" aria-label="sparkles" className="mr-2">✨</span> Edit Image</> : <><span role="img" aria-label="sparkles" className="mr-2">✨</span> Generate Image</>)}
              </Button>
            </div>
          </div>
        </Card>

        {/* Output Card */}
        <Card title="AI Generated Image" className="h-full">
          {generatingImage && <div className="text-center py-10 text-[var(--color-text-secondary)]">Generating/editing image...</div>}
          {imageAIError && <EmptyState title="Error" description={imageAIError} action={<Button onClick={sourceImageFile ? handleEdit : handleGenerate}>Retry</Button>} />}
          {generatedImages.length > 0 ? (
            <div className="space-y-4">
              {generatedImages.map((img) => (
                <div key={img.id} className="border border-[var(--color-border-primary)] rounded-md overflow-hidden bg-[var(--color-bg-stage)]">
                  <img
                    src={img.imageUrl}
                    alt={img.prompt}
                    className="w-full h-auto object-contain max-h-96"
                    loading="lazy"
                  />
                  <div className="p-3 text-sm text-[var(--color-text-secondary)]">
                    <p className="font-semibold text-[var(--color-text-primary)]">Prompt:</p>
                    <p>{img.prompt}</p>
                    <p className="mt-1">Aspect Ratio: {img.aspectRatio || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !generatingImage && !imageAIError && <EmptyState title="No Image Generated" description="Enter a prompt and click 'Generate Image' or upload a source image and 'Edit Image'." />
          )}
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default ImageDesignerPage;