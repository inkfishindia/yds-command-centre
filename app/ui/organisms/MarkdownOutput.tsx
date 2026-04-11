
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownOutputProps {
  content: string;
  className?: string;
}

const MarkdownOutput: React.FC<MarkdownOutputProps> = ({ content, className }) => {
  if (!content || content.trim() === '') {
    return <p className="text-[var(--color-text-secondary)] italic text-xs">No intelligence data available.</p>;
  }

  return (
    <div className={`prose dark:prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-black text-[var(--color-text-primary)] mt-4 mb-2 uppercase tracking-tight" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-black text-[var(--color-text-primary)] mt-3 mb-1 uppercase tracking-tight" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold text-[var(--color-text-primary)] mt-2 mb-1" {...props} />,
          p: ({ node, ...props }) => <p className="text-[var(--color-text-primary)] mb-2 leading-relaxed text-sm" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside text-[var(--color-text-primary)] mb-2 pl-2 space-y-1 text-sm" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-[var(--color-text-primary)] mb-2 pl-2 space-y-1 text-sm" {...props} />,
          li: ({ node, ...props }) => <li className="text-[var(--color-text-primary)]" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-black text-[var(--color-brand-primary)]" {...props} />,
          em: ({ node, ...props }) => <em className="italic text-[var(--color-text-secondary)]" {...props} />,
          a: ({ node, ...props }) => <a className="text-[var(--color-brand-primary)] font-bold hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
          code: ({ node, inline, className, children, ...props }: any) => {
            return !inline ? (
              <pre className="bg-[var(--color-bg-stage)] p-3 rounded-md overflow-x-auto my-2 text-[11px] font-mono border border-[var(--color-border-primary)]/50">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-[var(--color-bg-stage)] px-1 py-0.5 rounded-sm text-[11px] font-mono font-bold text-[var(--color-brand-primary)]" {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-[var(--color-brand-accent)] pl-4 italic text-[var(--color-text-secondary)] my-4 bg-[var(--color-bg-stage)]/30 py-2" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto border border-[var(--color-border-primary)] rounded-lg my-4">
              <table className="min-w-full divide-y divide-[var(--color-border-primary)]" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest bg-[var(--color-bg-stage)]" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2 text-xs text-[var(--color-text-primary)] border-b border-[var(--color-border-primary)]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownOutput;
