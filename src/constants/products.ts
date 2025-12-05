// src/constants/products.ts

export interface Product {
  name: string;
  url: string;
  image?: string; // Optional image path
  description?: string; // Optional description
  color?: string; // Optional gradient color class
}

/**
 * Products using OLI - Managed directly in the frontend
 * To add a new product, simply add an entry to this array
 */
export const PRODUCTS_USING_OLI: Product[] = [
  {
    name: 'growthepie Labels',
    url: 'https://labels.growthepie.com/',
    image: '/project-images/growthepie-labels.png',
    description: 'Explore labeled contracts and applications',
  },
  {
    name: 'growthepie Applications',
    url: 'https://www.growthepie.com/applications/',
    image: '/project-images/growthepie-applications.png',
    description: 'Discover applications using OLI labels',
  },
  {
    name: 'Blockscout Contract Metadata',
    url: 'https://blockscout.com/',
    image: '/project-images/blockscout.png',
    description: 'Block explorer providing contract metadata',
  },
  {
    name: 'AGX',
    url: 'https://agx.app/',
    image: '/project-images/agx.png',
    description: 'AGX platform leveraging OLI',
  },
  {
    name: 'Sourcify',
    url: 'https://repo.sourcify.dev/',
    image: '/project-images/sourcify.png',
    description: 'Contract verification with OLI integration',
  },
  {
    name: 'Enscribe Explorer',
    url: 'https://app.enscribe.xyz/',
    image: '/project-images/enscribe-explorer.png',
    description: 'Blockchain explorer with OLI labels',
  },
];

// Default gradient color for products without images
export const DEFAULT_PRODUCT_COLOR = 'from-blue-400 via-purple-500 to-pink-500';

