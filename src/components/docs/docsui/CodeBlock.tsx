'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  children: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  children, 
  language,
  title,
  showLineNumbers = false,
  className = ""
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };
  
  // Only show header if there's a title or a meaningful language (not 'text' or empty)
  const showHeader = title || (language && language !== 'text' && language !== '');

  return (
    <div className={`relative group ${className} ${showHeader ? 'bg-gray-800 rounded-lg' : ''}`}>
      {/* Header with title and language */}
      {showHeader && (
        <div className="flex items-center justify-between text-gray-300 px-2 py-2 text-sm">
          <div className="flex items-center gap-2">
            {title && <span className="font-medium">{title}</span>}
            {language && (
              <span className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">
                {language}
              </span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            title="Copy code"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Code content */}
      <div className="relative">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            fontSize: '0.875rem',
            lineHeight: '1.5',
            borderRadius: showHeader ? '0 0 0.5rem 0.5rem' : '0.5rem',
            background: '#0d1117',
            color: '#c9d1d9', // Default text color for the code block
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              backgroundColor: 'transparent' // Ensure code tags don't have a background that overrides the container
            }
          }}
          lineNumberStyle={{
            color: '#6b7280',
            paddingRight: '1rem',
            userSelect: 'none',
            minWidth: '2rem'
          }}
        >
          {children}
        </SyntaxHighlighter>
        
        {/* Copy button for code without header */}
        {!showHeader && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300"
            title="Copy code"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CodeBlock;