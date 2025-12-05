'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Clock, User, Calendar, ArrowLeft, Share2, Copy, Check, Twitter, Linkedin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { BlogPost } from '@/lib/blog';
import AuthorSocialLinks from './AuthorSocialLinks';
import CodeBlock from '../docs/docsui/CodeBlock';

interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const createSlugger = () => {
  const counts: Record<string, number> = {};
  return (text: string) => {
    const base = slugify(text);
    const count = counts[base] ?? 0;
    counts[base] = count + 1;
    return count ? `${base}-${count}` : base;
  };
};

const getTextContent = (node: any): string => {
  if (typeof node === 'string') return node;
  if (!node) return '';
  if (node.props && node.props.children) return getTextContent(node.props.children);
  if (Array.isArray(node)) return node.map(getTextContent).join('');
  return '';
};

interface BlogContentProps {
  post: BlogPost;
}

export default function BlogContent({ post }: BlogContentProps) {
  const [copied, setCopied] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);

  const headingSlugger = createSlugger();

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: url,
        });
      } catch {
        // Fallback to copy URL
        copyUrl();
      }
    } else {
      copyUrl();
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  useEffect(() => {
    const headingElements = Array.from(
      document.querySelectorAll<HTMLHeadingElement>('#article-content h1, #article-content h2, #article-content h3, #article-content h4')
    );

    const items: TableOfContentsItem[] = headingElements
      .map((el) => ({
        id: el.id,
        text: (el.textContent || '').trim().replace(/\s+/g, ' '),
        level: Number(el.tagName.replace('H', '')),
      }))
      .filter((item) => Boolean(item.id) && Boolean(item.text) && item.level <= 4);

    setTableOfContents(items);
    if (items.length > 0) {
      setActiveHeadingId(items[0].id);
    }
  }, [post.content]);

  useEffect(() => {
    if (tableOfContents.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveHeadingId(visible[0].target.id);
          return;
        }

        const sortedByTop = [...entries].sort(
          (a, b) => (a.target as HTMLElement).getBoundingClientRect().top - (b.target as HTMLElement).getBoundingClientRect().top
        );

        const firstVisible = sortedByTop.find((entry) => (entry.target as HTMLElement).getBoundingClientRect().top >= 0);
        if (firstVisible) {
          setActiveHeadingId(firstVisible.target.id);
        }
      },
      {
        rootMargin: '0px 0px -65% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 1],
      }
    );

    const elements = tableOfContents
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => Boolean(el));

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [tableOfContents]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Back to blog link */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to blog
          </Link>
        </div>
      </div>

      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-12">
          <div className="min-w-0">
            {/* Article header */}
            <header className="mb-10 max-w-3xl">
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    {tag}
                  </Link>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                {post.title}
              </h1>

              {/* Excerpt */}
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl">
                {post.excerpt}
              </p>

              {/* Meta information */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-8 p-6 bg-gray-50 rounded-2xl">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="font-medium">{post.author}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <time dateTime={post.date} className="font-medium">
                    {format(new Date(post.date), 'MMMM d, yyyy')}
                  </time>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{post.readingTime} min read</span>
                </div>
              </div>

              {/* Share button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Link copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share article
                    </>
                  )}
                </button>
              </div>
            </header>

            {tableOfContents.length > 0 && (
              <div className="lg:hidden mb-10">
                <div className="rounded-2xl border border-gray-100 bg-white/70 backdrop-blur-sm p-5 shadow-sm max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900">On this page</span>
                    <span className="text-xs text-gray-500">{tableOfContents.length} sections</span>
                  </div>
                  <div className="space-y-2">
                    {tableOfContents.map((item) => {
                      const isActive = activeHeadingId === item.id;
                      const indent = item.level === 1 ? '' : item.level === 2 ? 'ml-2' : 'ml-4';

                      return (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={() => setActiveHeadingId(item.id)}
                          aria-current={isActive ? 'true' : undefined}
                          className={`block rounded-xl px-3 py-2 text-sm transition-colors border ${indent} ${
                            isActive
                              ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {item.text}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Article content */}
            <div
              id="article-content"
              className="prose prose-lg max-w-none lg:max-w-3xl prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-a:font-medium prose-pre:relative prose-pre:bg-transparent prose-pre:text-inherit prose-pre:rounded-none prose-pre:shadow-none prose-code:bg-transparent prose-code:p-0 prose-code:text-inherit prose-code:font-mono prose-code:text-sm prose-img:rounded-xl prose-img:shadow-lg prose-img:cursor-zoom-in prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:rounded-r-xl prose-strong:text-gray-900 prose-strong:font-semibold"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ children }) => {
                    const text = getTextContent(children);
                    const id = headingSlugger(text || 'heading-1');
                    return (
                      <h1 id={id} className="scroll-mt-28">
                        {children}
                      </h1>
                    );
                  },
                  h2: ({ children }) => {
                    const text = getTextContent(children);
                    const id = headingSlugger(text || 'heading-2');
                    return (
                      <h2 id={id} className="scroll-mt-28">
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ children }) => {
                    const text = getTextContent(children);
                    const id = headingSlugger(text || 'heading-3');
                    return (
                      <h3 id={id} className="scroll-mt-28">
                        {children}
                      </h3>
                    );
                  },
                  h4: ({ children }) => {
                    const text = getTextContent(children);
                    const id = headingSlugger(text || 'heading-4');
                    return (
                      <h4 id={id} className="scroll-mt-28">
                        {children}
                      </h4>
                    );
                  },
                  pre: ({ children }) => {
                    const content = getTextContent(children);
                    let language = 'text';
                    
                    // Try to extract language from className (added by remark-gfm)
                    if (children && typeof children === 'object' && 'props' in children && 
                        children.props && typeof children.props === 'object' && 
                        'className' in children.props && typeof children.props.className === 'string') {
                      const match = /language-(\w+)/.exec(children.props.className);
                      if (match) language = match[1];
                    }
                    
                    return <CodeBlock language={language}>{content}</CodeBlock>;
                  },
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    
                    if (isInline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                    
                    return (
                      <CodeBlock language={match ? match[1] : 'text'}>
                        {String(children).replace(/\n$/, '')}
                      </CodeBlock>
                    );
                  }
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Article footer */}
            <footer className="mt-16 pt-8 border-t border-gray-200 max-w-3xl">
              <div className="flex flex-col gap-6 p-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl">
                {/* Author info and social links */}
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Written by {post.author}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Published on {format(new Date(post.date), 'MMMM d, yyyy')}
                    </p>
                    <AuthorSocialLinks authorSocial={post.authorSocial} />
                  </div>
                </div>
                
                {/* Share buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600 font-medium">Share:</span>
                  <button
                    onClick={() => {
                      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                    title="Share on Twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => {
                      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                    title="Share on LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={copyUrl}
                    className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                    title="Copy link"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </footer>
          </div>

          {tableOfContents.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-white/70 backdrop-blur-sm p-5 shadow-sm max-h-[75vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900">On this page</span>
                    <span className="text-xs text-gray-500">{tableOfContents.length} sections</span>
                  </div>
                  <div className="space-y-1">
                    {tableOfContents.map((item) => {
                      const isActive = activeHeadingId === item.id;
                      const indent = item.level === 1 ? '' : item.level === 2 ? 'ml-2' : 'ml-4';

                      return (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={() => setActiveHeadingId(item.id)}
                          aria-current={isActive ? 'true' : undefined}
                          className={`block rounded-xl px-3 py-2 text-sm transition-colors border ${indent} ${
                            isActive
                              ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {item.text}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </article>
    </div>
  );
}
