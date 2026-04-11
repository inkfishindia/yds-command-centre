// pages/ai_studio/BlogGeneratorPage.tsx
import React, { useState, useCallback } from 'react';
import { Card, Button, Input, EmptyState, ManagerEditorLayout, MarkdownOutput } from '../../ui'; // Changed Page, Card, Button, Input, EmptyState, MarkdownOutput
import { useAuth } from '../../contexts/AuthContext';
import { useAITools } from '../../contexts/AIToolsContext';
import DemoModeBanner from '../../components/layout/DemoModeBanner';

const BlogGeneratorPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    blogPost, loadingTextAI, textAIError,
    generateBlogPost, clearTextAIResults,
  } = useAITools();

  const [blogTopic, setBlogTopic] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!blogTopic.trim()) {
      alert('Please enter a blog topic.');
      return;
    }
    await generateBlogPost(blogTopic);
  }, [blogTopic, generateBlogPost]);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Blog Generator">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to use the AI Blog Generator"
            description="Connect your Google account to draft engaging blog posts with AI assistance."
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
    <ManagerEditorLayout title="Blog Generator">
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Draft engaging blog posts on any topic, complete with title, content, and SEO meta description.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input/Controls Card */}
        <Card title="Inputs" className="h-fit">
          <div className="space-y-4">
            <Input
              label="Blog Topic"
              value={blogTopic}
              onChange={e => setBlogTopic(e.target.value)}
              placeholder="e.g., The Future of Sustainable Farming"
              required
            />
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={clearTextAIResults} disabled={loadingTextAI}>Clear Results</Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loadingTextAI || !blogTopic.trim()}
              >
                {loadingTextAI ? 'Generating...' : <><span role="img" aria-label="sparkles" className="mr-2">✨</span> Generate Blog Post</>}
              </Button>
            </div>
          </div>
        </Card>

        {/* Output Card */}
        <Card title="AI Generated Blog Post" className="h-full">
          {loadingTextAI && <div className="text-center py-10 text-[var(--color-text-secondary)]">Generating blog post content...</div>}
          {textAIError && <EmptyState title="Error" description={textAIError} action={<Button onClick={handleGenerate}>Retry</Button>} />}
          {blogPost ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-brand-primary)] mb-2">{blogPost.title}</h2>
                <MarkdownOutput content={blogPost.content} />
              </div>
              <div className="pt-4 border-t border-[var(--color-border-primary)]">
                <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">SEO Meta Description</h3>
                <p className="text-[var(--color-text-secondary)]">{blogPost.metaDescription}</p>
              </div>
            </div>
          ) : (
            !loadingTextAI && !textAIError && <EmptyState title="No Results Yet" description="Enter a blog topic, then click 'Generate Blog Post'." />
          )}
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default BlogGeneratorPage;