import React, { Suspense } from 'react';
import { Metadata } from 'next';
import EnhancedDocsLayout from '@/components/docs/EnhancedDocsLayout';

export const metadata: Metadata = {
  title: 'OLI Documentation | Open Labels Initiative',
  description: 'Guides, reference, and schema documentation for the Open Labels Initiative. Learn how to integrate, contribute, and explore tags and valuesets.',
  alternates: {
    canonical: '/docs',
  },
  openGraph: {
    title: 'OLI Documentation | Open Labels Initiative',
    description: 'Guides, reference, and schema documentation for the Open Labels Initiative.',
    url: 'https://openlabelsinitiative.org/docs',
    siteName: 'Open Labels Initiative',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Open Labels Initiative',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OLI Documentation | Open Labels Initiative',
    description: 'Guides, reference, and schema documentation for the Open Labels Initiative.',
    images: ['/og-image.png'],
  },
};

function DocsContent() {
  return <EnhancedDocsLayout />;
}

export default function DocsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DocsContent />
    </Suspense>
  );
} 
