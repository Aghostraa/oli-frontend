'use client';

import React from 'react';
import { SdkPlayground } from '@/components/sdk-playground/SdkPlayground';

export default function SdkPlaygroundPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
      <SdkPlayground />
    </main>
  );
}
