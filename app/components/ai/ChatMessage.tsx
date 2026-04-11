

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../../contexts/ThemeContext';
import { ChatMessage as ChatMessageType } from '../../types'; // FIX: Import ChatMessage type

interface ChatMessageProps {
  // FIX: Use the imported ChatMessageType for consistency
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { theme } = useTheme();
  const isUser = message.role === 'user';
  const isError = !!message.error;
  
  const bubbleClasses = isUser
    ? 'bg-[var(--color-brand-primary)] text-[var(--color-brand-primary-fg)] self-end'
    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] self-start';
  
  const errorBubbleClasses = 'bg-red-500/20 border border-red-500/50 text-red-300 self-start';

  const renderContent = () => {
    if (message.error) {
      return <p className="font-mono text-xs md:text-sm">{message.error}</p>; // Responsive text size for error
    }

    // FIX: Add a defensive check for message.parts before calling .map
    if (!message.parts || message.parts.length === 0) {
      return <p className="text-sm md:text-base text-[var(--color-text-secondary)] italic">No content generated.</p>;
    }

    const contentParts = message.parts.map((part, index) => {
      if (part.text) {
        return (
          // Changed prose-sm to prose and explicitly set responsive text size for paragraphs
          <div key={index} className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-sm md:text-base" {...props} />, // Responsive text size for markdown paragraphs
                a: ({node, ...props}) => <a className="text-[var(--color-brand-accent)] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                code: ({node, className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  return !isInline ? (
                    <pre className="bg-[var(--color-bg-stage)] p-3 rounded-md overflow-x-auto my-2 text-sm">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-[var(--color-bg-stage)] px-1 py-0.5 rounded-sm text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {part.text}
            </ReactMarkdown>
          </div>
        );
      }
      if (part.functionCall) {
        return (
          <div key={index} className="p-2 bg-black/20 rounded-md my-1 font-mono text-xs md:text-sm"> {/* Responsive text size for function calls */}
            <p><strong>Tool Call:</strong> {part.functionCall.name}</p>
            <pre><code>{JSON.stringify(part.functionCall.args, null, 2)}</code></pre>
          </div>
        );
      }
      if (part.functionResponse) {
        return (
          <div key={index} className="p-2 bg-black/20 rounded-md my-1 font-mono text-xs md:text-sm max-h-40 overflow-auto"> {/* Responsive text size for function responses */}
            <p><strong>Tool Result:</strong> {part.functionResponse.name}</p>
            <pre><code>{JSON.stringify(part.functionResponse.response, null, 2)}</code></pre>
          </div>
        );
      }
      return null;
    });

    return contentParts;
  };

  const emojiAvatar = isUser ? '👤' : '🤖';

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-bg-surface)] text-xl shrink-0">
        {emojiAvatar}
      </div>
      <div className={`max-w-xl rounded-lg px-4 py-2 ${isError ? errorBubbleClasses : bubbleClasses}`} style={{ boxShadow: 'var(--shadow-elevation)' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ChatMessage;