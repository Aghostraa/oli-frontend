'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface DropdownContextType {
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  closeAllDropdowns: () => void;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export function DropdownProvider({ children }: { children: React.ReactNode }) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const closeAllDropdowns = useCallback(() => {
    setOpenDropdownId(null);
  }, []);

  return (
    <DropdownContext.Provider value={{ openDropdownId, setOpenDropdownId, closeAllDropdowns }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function useDropdownContext() {
  const context = useContext(DropdownContext);
  // If context is not available, return a fallback that uses local state
  if (!context) {
    return null;
  }
  return context;
}

