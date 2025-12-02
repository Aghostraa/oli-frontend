import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { useSearchParams, useRouter } from 'next/navigation';
import { Key, ExternalLink } from 'lucide-react';
import FaqScript from '../FaqScript';
import MermaidDiagram from './docsui/MermaidDiagram';
import { 
  DOC_SECTIONS,
  SimpleLinkResolver, 
  DocSection,
  ParsedLink,
  findSectionById,
  getAllValidSectionIds,
  DEFAULT_LINK_CONTEXT
} from '../../constants/docsConfig';
import {
  DocHeader,
  DocSidebar,
  DocContent,
  DocContentBody,
  LoadingSpinner,
  ErrorDisplay,
  ActionButton,
  InfoSection,
  CodeBlock
} from './docsui/index';
import 'katex/dist/katex.min.css';

// Enhanced documentation system with predefined hierarchical structure

interface EnhancedDocsLayoutProps {
  className?: string;
}

const convertToGitHubBlobUrl = (rawUrl: string): string => {
  // Convert raw.githubusercontent.com URLs to github.com blob URLs
  if (rawUrl.includes('raw.githubusercontent.com')) {
    // Format: https://raw.githubusercontent.com/owner/repo/branch/path/file
    // Convert to: https://github.com/owner/repo/blob/branch/path/file
    const convertedUrl = rawUrl
      .replace('raw.githubusercontent.com', 'github.com')
      .replace(/^(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/([^\/]+)\/(.*)$/, '$1/blob/$2/$3');
    return convertedUrl;
  }
  
  // Handle URLs that already have /raw/ in the path
  if (rawUrl.includes('/raw/')) {
    const convertedUrl = rawUrl.replace('/raw/', '/blob/');
    return convertedUrl;
  }
  
  // Return as-is if no conversion needed
  return rawUrl;
};

// Simple image cache using sessionStorage for persistence
const getImageFromCache = (src: string): string | null => {
  try {
    return sessionStorage.getItem(`img_cache_${btoa(src)}`);
  } catch {
    return null;
  }
};

const setImageToCache = (src: string, dataUrl: string): void => {
  try {
    sessionStorage.setItem(`img_cache_${btoa(src)}`, dataUrl);
  } catch {
    // Silent fail if storage is full or unavailable
  }
};

// Helper function to cache images as data URLs
const cacheImage = async (src: string): Promise<string> => {
  const cached = getImageFromCache(src);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Check if the blob is actually an image
    if (!blob.type.startsWith('image/')) {
      throw new Error(`Not an image: ${blob.type}`);
    }
    
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });
    
    setImageToCache(src, dataUrl);
    return dataUrl;
  } catch (error) {
    throw error; // Re-throw to let caller handle
  }
};

const EnhancedDocsLayout: React.FC<EnhancedDocsLayoutProps> = ({ className = "" }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sectionParam = searchParams.get('section');
  
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [content, setContent] = useState<{ [key: string]: string }>({});
  const [currentContext, setCurrentContext] = useState('README.md');
  
  // Initialize the simplified documentation system
  const { docSections, linkResolver } = useMemo(() => {
    const resolver = new SimpleLinkResolver(DEFAULT_LINK_CONTEXT, DOC_SECTIONS);
    return { docSections: DOC_SECTIONS, linkResolver: resolver };
  }, []);

  const [activeSection, setActiveSection] = useState(() => {
    const validSectionIds = getAllValidSectionIds(docSections);
    return sectionParam && validSectionIds.includes(sectionParam) 
      ? sectionParam 
      : 'overview';
  });

  // Update URL when active section changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', activeSection);
    router.replace(`/docs?${params.toString()}`, { scroll: false });
  }, [activeSection, router, searchParams]);

  // Update currentContext when active section changes
  useEffect(() => {
    const currentSection = findSectionById(activeSection, docSections);
    if (currentSection?.githubPath) {
      setCurrentContext(currentSection.githubPath);
      linkResolver.updateContext({ currentFilePath: currentSection.githubPath });
    }
  }, [activeSection, docSections, linkResolver]);

  const fetchContent = useCallback(async (section: DocSection) => {
    if (!section.githubUrl || content[section.id]) return;

    setLoading(prev => ({ ...prev, [section.id]: true }));
    
    try {
      const response = await fetch(section.githubUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      let text = await response.text();
      
      // Handle different file types
      if (section.fileType === 'yaml' || section.githubPath?.endsWith('.yml') || section.githubPath?.endsWith('.yaml')) {
        text = `# ${section.title}\n\n${section.description}\n\n\`\`\`yaml\n${text}\n\`\`\``;
      } else if (section.fileType === 'json' || section.githubPath?.endsWith('.json')) {
        text = `# ${section.title}\n\n${section.description}\n\n\`\`\`json\n${text}\n\`\`\``;
      } else {
        // Remove the first # heading from markdown content
        text = text.replace(/^#\s+.*?\n/, '');
        
        // Process FAQ sections with details/summary tags for markdown files
        text = processFaqSections(text);
      }
      
      // Update link resolver context
      if (section.githubPath) {
        linkResolver.updateContext({ currentFilePath: section.githubPath });
        setCurrentContext(section.githubPath);
      }
      
      setContent(prev => ({ ...prev, [section.id]: text }));
  } catch {
    setContent(prev => ({ 
      ...prev, 
      [section.id]: `# Error Loading Content\n\nFailed to load content from GitHub. Please try again later or visit the [source directly](${section.githubUrl}).` 
    }));
    } finally {
      setLoading(prev => ({ ...prev, [section.id]: false }));
    }
  }, [content, linkResolver]);

  useEffect(() => {
    const currentSection = findSectionById(activeSection, docSections);
    if (currentSection && currentSection.githubUrl) {
      fetchContent(currentSection);
    }
  }, [activeSection, fetchContent, docSections]);

  // Handle FAQ scrolling after content loads
  useEffect(() => {
    if (content[activeSection] && activeSection === 'overview') {
      // Check if we should scroll to FAQ
      const shouldScrollToFAQ = typeof window !== 'undefined' && sessionStorage.getItem('scrollToFAQ');
      
      if (shouldScrollToFAQ) {
        // Clear the flag
        sessionStorage.removeItem('scrollToFAQ');
        
        // Wait for content to render, then scroll to FAQ
        setTimeout(() => {
          // Try multiple selectors to find the FAQ section
          const faqSelectors = [
            'h1[id*="frequently-asked-questions"]',
            'h2[id*="frequently-asked-questions"]', 
            'h1[id*="faq"]',
            'h2[id*="faq"]',
            '[id*="frequently-asked-questions"]',
            '.custom-faq-container'
          ];
          
          let faqElement = null;
          for (const selector of faqSelectors) {
            faqElement = document.querySelector(selector);
            if (faqElement) break;
          }
          
          // If we still can't find it, try text-based search
          if (!faqElement) {
            const headings = document.querySelectorAll('h1, h2, h3');
            for (const heading of headings) {
              if (heading.textContent?.toLowerCase().includes('frequently asked questions') || 
                  heading.textContent?.toLowerCase().includes('faq')) {
                faqElement = heading;
                break;
              }
            }
          }
          
          if (faqElement) {
            faqElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 1000); // Wait 1 second for content to render
      }
    }
  }, [content, activeSection]);

  // Process FAQ sections with details/summary tags
  const processFaqSections = (text: string): string => {
    // Look for FAQ section and process details/summary elements
    // Match both common FAQ heading formats
    const faqSectionRegexes = [
      /(## Frequently Asked Questions \(FAQ\)[\s\S]*?)(?=^## |$)/m,
      /(## FAQ[\s\S]*?)(?=^## |$)/m,
      /(# Frequently Asked Questions[\s\S]*?)(?=^# |$)/m,
      /(# FAQ[\s\S]*?)(?=^# |$)/m
    ];
    
    let processedText = text;
    
    // Try each regex pattern
    for (const regex of faqSectionRegexes) {
      const match = processedText.match(regex);
      if (match) {
        const faqSection = match[1];
        
        // Extract individual FAQ items using a more robust pattern that handles different formats
        const detailsRegexes = [
          // Standard details/summary format
          /<details>\s*<summary><strong>(.*?)<\/strong><\/summary>\s*([\s\S]*?)<\/details>/g,
          // Alternative format with just summary text
          /<details>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)<\/details>/g,
          // Format with h3/h4 headings followed by paragraphs
          /### ([^\n]+)\s*([\s\S]*?)(?=### |$)/g
        ];
        
        const faqItems = [];
        
        // Try each regex pattern for FAQ items
        for (const detailsRegex of detailsRegexes) {
          let detailsMatch;
          const tempFaqItems = [];
          
          while ((detailsMatch = detailsRegex.exec(faqSection)) !== null) {
            const question = detailsMatch[1].replace(/<\/?strong>/g, '').trim();
            let answer = detailsMatch[2].trim();
            
            // Clean up the answer content
            answer = answer.replace(/^\s+|\s+$/gm, ''); // Remove leading/trailing whitespace from lines
            answer = answer.replace(/\n\s*\n/g, '\n\n'); // Normalize paragraph breaks
            
            tempFaqItems.push({ question, answer });
          }
          
          // If we found items with this regex, use them
          if (tempFaqItems.length > 0) {
            faqItems.push(...tempFaqItems);
            break;
          }
        }
        
        if (faqItems.length > 0) {
          // Build custom HTML FAQ section
          let customFaqHtml = '## Frequently Asked Questions (FAQ)\n\n<div class="custom-faq-container">\n';
          
          faqItems.forEach(({ question, answer }) => {
            customFaqHtml += `
<div class="custom-faq-item">
  <button class="custom-faq-question">
    <strong>${question}</strong>
    <span class="custom-faq-icon">+</span>
  </button>
  <div class="custom-faq-answer">
    ${answer}
  </div>
</div>
`;
          });
          
          customFaqHtml += '</div>\n';
          
          // Replace the original FAQ section with our custom HTML
          processedText = processedText.replace(match[0], customFaqHtml);
        }
      }
    }
    
    return processedText;
  };

  // Enhanced link renderer using the new system
  const renderLink = useCallback((href: string, children: React.ReactNode, props: any): React.ReactElement => {
    const hrefString = typeof href === 'string' ? href : '';
    const parsedLink: ParsedLink = linkResolver.resolveLink(hrefString);
    
    // Handle internal document links
    if (parsedLink.linkType === 'internal-doc' && parsedLink.resolvedHref.startsWith('#')) {
      const targetSectionId = parsedLink.resolvedHref.slice(1);
      const targetSection = findSectionById(targetSectionId, docSections);
      
      if (targetSection) {
        return (
          <button
            onClick={() => setActiveSection(targetSectionId)}
            className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            title={parsedLink.title || targetSection.description}
            {...props}
          >
            {children}
          </button>
        );
      }
    }

    return (
      <a
        href={parsedLink.resolvedHref}
        target={parsedLink.openInNewTab ? "_blank" : undefined}
        rel={parsedLink.openInNewTab ? "noopener noreferrer" : undefined}
        className="text-indigo-600 hover:text-indigo-800 underline"
        title={parsedLink.title || parsedLink.description}
        {...props}
      >
        {children}
        {parsedLink.openInNewTab && (
          <svg 
            className="inline w-3 h-3 ml-1" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        )}
      </a>
    );
  }, [linkResolver, docSections]);

  const renderContent = () => {
    const currentSection = findSectionById(activeSection, docSections);
    
    if (!currentSection) {
      return <div className="text-center text-gray-500">Section not found</div>;
    }


    if (currentSection.component) {
      const Component = currentSection.component;
      
      // For Label Schema child sections, add InfoSection
      if (currentSection.id === 'tag-documentation' || 
          currentSection.id === 'tag-definitions' || 
          currentSection.id === 'tag-valuesets' ||
          currentSection.id === 'usage-category-valueset') {
        
        return (
          <>
            <InfoSection
              title="Core Components"
              items={[
                { label: 'address', description: 'Hexadecimal public address of a smart contract or EOA' },
                { label: 'chain_id', description: 'CAIP-2 identifier (includes EIP-155)' },
                { label: 'tag_id', description: 'Unique identifier for the tag type. Multiple tags can be applied to the same address+chain combination.' },
                { label: 'value', description: 'The specific content/value assigned to the tag for this address' }
              ]}
            />
            {currentSection.id === 'tag-documentation' 
              ? React.createElement(Component as any, { showHeader: false })
              : <Component />
            }
          </>
        );
      }
      
      // For other components
      return <Component />;
    }

    const sectionContent = content[currentSection.id];
    const isLoading = loading[currentSection.id];
    
    // Show loading state if currently loading or if no content exists yet (first load)
    if (isLoading || (!sectionContent && currentSection.githubUrl)) {
      return <LoadingSpinner message="We are updating the docs to the latest version..." />;
    }

    if (!sectionContent) {
      return (
        <ErrorDisplay 
          message="No content available for this section."
          githubUrl={currentSection.githubUrl}
          className="text-center py-12"
        />
      );
    }

    // Check if this is a child of label-schema section
    const isLabelSchemaChild = currentSection.parent === 'label-schema' || 
                               currentSection.parent === 'tag-valuesets';
    
    // For non-component children of Label Schema, wrap content with InfoSection
    if (isLabelSchemaChild) {
      return (
        <>
          <InfoSection
            title="Core Components"
            items={[
              { label: 'address', description: 'Hexadecimal public address of a smart contract or EOA' },
              { label: 'chain_id', description: 'CAIP-2 identifier (includes EIP-155)' },
              { label: 'tag_id', description: 'Unique identifier for the tag type. Multiple tags can be applied to the same address+chain combination.' },
              { label: 'value', description: 'The specific content/value assigned to the tag for this address' }
            ]}
          />
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              components={{
                a: ({ href, children, ...props }) => renderLink(href || '', children, props),
                img: ({ src, alt, ...props }) => {
                  const srcString = typeof src === 'string' ? src : '';
                  let originalImageSrc = srcString;
                  
                  if (srcString && !srcString.startsWith('http') && currentContext) {
                    const contextDir = currentContext.split('/').slice(0, -1).join('/');
                    originalImageSrc = `https://raw.githubusercontent.com/openlabelsinitiative/OLI/main/${contextDir}/${srcString}`;
                  }
                  
                  // Simple cached image component
                  const CachedImage = React.memo(function CachedImage() {
                    const [imageSrc, setImageSrc] = useState(() => {
                      const cached = getImageFromCache(originalImageSrc);
                      return cached || originalImageSrc;
                    });
                    
                    const [hasErrored, setHasErrored] = useState(false);
                    
                    useEffect(() => {
                      // Prevent double execution in React StrictMode
                      let isCancelled = false;
                      
                      const loadImage = async () => {
                        const cached = getImageFromCache(originalImageSrc);
                        if (cached) {
                          if (!isCancelled) {
                            setImageSrc(cached);
                          }
                          return;
                        }
                        
                        // Only try to cache if the image URL looks valid and hasn't errored
                        if (originalImageSrc && !hasErrored) {
                          try {
                            const cachedSrc = await cacheImage(originalImageSrc);
                            if (!isCancelled && cachedSrc !== originalImageSrc) {
                              setImageSrc(cachedSrc);
                            }
                          } catch {
                            if (!isCancelled) {
                              setHasErrored(true);
                            }
                          }
                        }
                      };
                      
                      loadImage();
                      
                      return () => {
                        isCancelled = true;
                      };
                    }, [hasErrored]); // Removed originalImageSrc from dependencies
                    
                    return (
                      /* eslint-disable @next/next/no-img-element */
                      <img 
                        src={imageSrc} 
                        alt={alt || ''} 
                        className="max-w-full h-auto rounded-lg shadow-sm"
                        loading="lazy"
                        onLoad={() => {}}
                        onError={(e) => {
                          setHasErrored(true);
                          
                          // Hide broken images gracefully
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                        style={{ 
                          maxWidth: '100%', 
                          height: 'auto',
                          imageRendering: 'auto',
                          display: hasErrored ? 'none' : 'block'
                        }}
                        {...props} 
                      />
                      /* eslint-enable @next/next/no-img-element */
                    );
                  });
                  
                  return <CachedImage />;
                },
                pre: ({ children }) => {
                  const getTextContent = (node: any): string => {
                    if (typeof node === 'string') return node;
                    if (!node) return '';
                    if (node.props && node.props.children) return getTextContent(node.props.children);
                    if (Array.isArray(node)) return node.map(getTextContent).join('');
                    return '';
                  };
                  
                  const content = getTextContent(children);
                  let language = 'text';
                  
                  // Try to extract language from className (added by remark-gfm)
                  if (children && typeof children === 'object' && 'props' in children && 
                      children.props && typeof children.props === 'object' && 
                      'className' in children.props && typeof children.props.className === 'string') {
                    const match = /language-(\w+)/.exec(children.props.className);
                    if (match) language = match[1];
                  }
                  
                  // Handle Mermaid diagrams
                  if (language === 'mermaid') {
                    return <MermaidDiagram chart={content} />;
                  }
                  
                  return <CodeBlock language={language}>{content}</CodeBlock>;
                },
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300" {...props}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children, ...props }) => (
                  <th
                    className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 bg-gray-50"
                    {...props}
                  >
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td
                    className="whitespace-nowrap py-4 px-3 text-sm text-gray-500"
                    {...props}
                  >
                    {children}
                  </td>
                )
              }}
            >
              {sectionContent}
            </ReactMarkdown>
          </div>
        </>
      );
    }

    return (
      <div className="prose prose-lg max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={{
            a: ({ href, children, ...props }) => renderLink(href || '', children, props),
            // Enhanced image handling for GitHub images with persistent caching
            img: ({ src, alt, ...props }) => {
              const srcString = typeof src === 'string' ? src : '';
              let originalImageSrc = srcString;
              
              if (srcString && !srcString.startsWith('http') && currentContext) {
                const contextDir = currentContext.split('/').slice(0, -1).join('/');
                originalImageSrc = `https://raw.githubusercontent.com/openlabelsinitiative/OLI/main/${contextDir}/${srcString}`;
              }
              
              // Simple cached image component
              const CachedImage = React.memo(function CachedImage() {
                const [imageSrc, setImageSrc] = useState(() => {
                  const cached = getImageFromCache(originalImageSrc);
                  return cached || originalImageSrc;
                });
                
                const [hasErrored, setHasErrored] = useState(false);
                
                useEffect(() => {
                  // Prevent double execution in React StrictMode
                  let isCancelled = false;
                  
                  const loadImage = async () => {
                    const cached = getImageFromCache(originalImageSrc);
                    if (cached) {
                      if (!isCancelled) {
                        setImageSrc(cached);
                      }
                      return;
                    }
                    
                    // Only try to cache if the image URL looks valid and hasn't errored
                    if (originalImageSrc && !hasErrored) {
                      try {
                        const cachedSrc = await cacheImage(originalImageSrc);
                        if (!isCancelled && cachedSrc !== originalImageSrc) {
                          setImageSrc(cachedSrc);
                        }
                      } catch {
                        if (!isCancelled) {
                          setHasErrored(true);
                        }
                      }
                    }
                  };
                  
                  loadImage();
                  
                  return () => {
                    isCancelled = true;
                  };
                }, [hasErrored]); // Removed originalImageSrc from dependencies
                
                return (
                  /* eslint-disable @next/next/no-img-element */
                  <img 
                    src={imageSrc} 
                    alt={alt || ''} 
                    className="max-w-full h-auto rounded-lg shadow-sm"
                    loading="lazy"
                    onLoad={() => {}}
                    onError={(e) => {
                      setHasErrored(true);
                      
                      // Hide broken images gracefully
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      imageRendering: 'auto',
                      display: hasErrored ? 'none' : 'block'
                    }}
                    {...props} 
                  />
                  /* eslint-enable @next/next/no-img-element */
                );
              });
              
              return <CachedImage />;
            },
            // Enhanced code block styling
            pre: ({ children }) => {
              // Extract text content from children for CodeBlock
              const getTextContent = (node: any): string => {
                if (typeof node === 'string') return node;
                if (Array.isArray(node)) return node.map(getTextContent).join('');
                if (node?.props?.children) return getTextContent(node.props.children);
                return '';
              };
              
              const codeContent = getTextContent(children);
              
              // Try to detect language from the code element
              let language = '';
              if (children && typeof children === 'object' && 'props' in children) {
                const childProps = (children as any).props;
                if (childProps?.className) {
                  const match = childProps.className.match(/language-(\w+)/);
                  if (match) {
                    language = match[1];
                  }
                }
              }
              
              // Handle Mermaid diagrams
              if (language === 'mermaid') {
                return <MermaidDiagram chart={codeContent} />;
              }
              
              return (
                <CodeBlock language={language || undefined}>
                  {codeContent}
                </CodeBlock>
              );
            },
            // Custom FAQ component renderer
            div: ({ className, children, ...props }) => {
              if (className === 'custom-faq-container') {
                return (
                  <div className="custom-faq-container" {...props}>
                    {children}
                  </div>
                );
              } else if (className === 'custom-faq-item') {
                return (
                  <div 
                    className="custom-faq-item" 
                    {...props}
                  >
                    {children}
                  </div>
                );
              } else if (className === 'custom-faq-answer') {
                return (
                  <div className="custom-faq-answer" {...props}>
                    {children}
                  </div>
                );
              }
              return <div className={className} {...props}>{children}</div>;
            },
            // Custom button renderer for FAQ questions
            button: ({ className, children, ...props }) => {
              if (className === 'custom-faq-question') {
                return (
                  <button 
                    className="custom-faq-question"
                    onClick={(e) => {
                      e.preventDefault();
                      const item = e.currentTarget.parentElement;
                      if (item) {
                        item.classList.toggle('active');
                      }
                    }}
                    {...props}
                  >
                    {children}
                  </button>
                );
              }
              return <button className={className} {...props}>{children}</button>;
            },
            // Custom span renderer for FAQ icons
            span: ({ className, children, ...props }) => {
              if (className === 'custom-faq-icon') {
                return (
                  <span className="custom-faq-icon" {...props}>
                    +
                  </span>
                );
              }
              return <span className={className} {...props}>{children}</span>;
            },
            // Enhanced inline code styling
            code: ({ children, className, ...props }) => {
              // Check if this is a code block (has language class) or inline code
              const isCodeBlock = className?.includes('language-');
              
              if (isCodeBlock) {
                // This is handled by the pre element above
                return <code className={className} {...props}>{children}</code>;
              }
              
              // Inline code styling
              return (
                <code 
                  className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono border"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            // Enhanced table styling
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200" {...props}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children, ...props }) => (
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props}>
                {children}
              </th>
            ),
            td: ({ children, ...props }) => (
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" {...props}>
                {children}
              </td>
            )
          }}
        >
          {sectionContent}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Enhanced Sidebar Navigation */}
          <div className="lg:col-span-1">
            <DocSidebar 
              sections={docSections.map(section => ({
                id: section.id,
                title: section.title,
                githubUrl: section.githubUrl,
                children: section.children?.map(child => ({
                  id: child.id,
                  title: child.title,
                  githubUrl: child.githubUrl,
                  isClickable: child.isClickable,
                  children: child.children?.map(grandchild => ({
                    id: grandchild.id,
                    title: grandchild.title,
                    githubUrl: grandchild.githubUrl,
                    isClickable: grandchild.isClickable
                  }))
                })),
                isClickable: section.isClickable
              }))}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
          </div>

          {/* Enhanced Content Area */}
          <div className="lg:col-span-3 mt-8 lg:mt-0">
            <DocContent>
              {/* Header with context information */}
              <DocHeader
                title={findSectionById(activeSection, docSections)?.title || 'Documentation'}
                description={findSectionById(activeSection, docSections)?.description || ''}
                actions={
                  <>
                    {/* Special buttons for Label Schema section */}
                    {activeSection === 'label-schema' ? (
                      <>
                        <ActionButton
                          href="https://github.com/openlabelsinitiative/OLI/tree/main/1_label_schema"
                          external
                          icon={
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                          }
                        >
                          Docs on GitHub
                        </ActionButton>
                        <ActionButton
                          href="https://github.com/openlabelsinitiative/OLI/blob/main/1_label_schema/tags/tag_definitions.yml"
                          external
                          icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          }
                        >
                          Add new tag_id
                        </ActionButton>
                      </>
                    ) : activeSection === 'tag-documentation' ? (
                      <>
                        <ActionButton
                          href="https://github.com/openlabelsinitiative/OLI/blob/main/1_label_schema/tags/tag_definitions.yml"
                          external
                          icon={
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                          }
                        >
                          View on GitHub
                        </ActionButton>
                        <ActionButton
                          onClick={() => {
                            // Set URL parameters to trigger usage category view
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('viewUsageCategory', 'true');
                            router.replace(`/docs?${params.toString()}`, { scroll: false });
                          }}
                          icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          }
                          className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                        >
                          View Usage Categories
                        </ActionButton>
                      </>
                    ) : activeSection === 'api-reference' ? (
                      <>
                        <ActionButton
                          onClick={() => {
                            window.location.href = '/developer';
                          }}
                          icon={<Key className="w-5 h-5" />}
                        >
                          Get API Key
                        </ActionButton>
                        <ActionButton
                          href="https://api.openlabelsinitiative.org/openapi.json"
                          external
                          icon={<ExternalLink className="w-5 h-5" />}
                        >
                          OpenAPI Spec
                        </ActionButton>
                      </>
                    ) : (
                      /* Default GitHub button for other sections */
                      findSectionById(activeSection, docSections)?.githubUrl && (
                        <ActionButton
                          href={convertToGitHubBlobUrl(findSectionById(activeSection, docSections)?.githubUrl || '')}
                          external
                          icon={
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                          }
                        >
                          View on GitHub
                        </ActionButton>
                      )
                    )}
                  </>
                }
              />
              
              {/* Core Components section for Label Schema */}
              {activeSection === 'label-schema' && (
                <InfoSection
                  title="Core Components"
                  items={[
                    { label: 'address', description: 'Hexadecimal public address of a smart contract or EOA' },
                    { label: 'chain_id', description: 'CAIP-2 identifier (includes EIP-155)' },
                    { label: 'tag_id', description: 'Unique identifier for the tag type. Multiple tags can be applied to the same address+chain combination.' },
                    { label: 'value', description: 'The specific content/value assigned to the tag for this address' }
                  ]}
                />
              )}
              
              <DocContentBody>
                {renderContent()}
              </DocContentBody>
            </DocContent>
          </div>
        </div>
      </div>

      {/* FAQ Script for enhanced functionality */}
      <FaqScript />
    </div>
  );
};

export default EnhancedDocsLayout;
