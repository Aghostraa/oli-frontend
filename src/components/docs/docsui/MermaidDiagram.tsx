'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const renderDiagram = async () => {
      if (!containerRef.current || !chart) return;

      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import mermaid
        const mermaid = (await import('mermaid')).default;

        // Initialize mermaid with configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });

        if (!mounted) return;

        // Generate a unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Clear the container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Render the diagram
        const { svg } = await mermaid.render(id, chart.trim());

        if (mounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className={`border border-red-300 bg-red-50 rounded-lg p-4 ${className}`}>
        <p className="text-red-800 text-sm font-medium mb-2">Failed to render diagram</p>
        <p className="text-red-600 text-xs">{error}</p>
        <pre className="mt-2 text-xs text-gray-700 overflow-x-auto">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={`mermaid-container my-6 ${className}`}>
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-gray-500">Loading diagram...</div>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex items-center justify-center"
        style={{ minHeight: isLoading ? '100px' : 'auto' }}
      />
    </div>
  );
};

export default MermaidDiagram;

