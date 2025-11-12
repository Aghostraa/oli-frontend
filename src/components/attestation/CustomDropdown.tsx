// components/attestation/CustomDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { isOrbitChain } from '@/constants/chains';
import { useDropdownContext } from '@/contexts/DropdownContext';

// Enhanced DropdownOption to support grouping and descriptions
interface DropdownOption {
  value: string | number;
  label: string;
  description?: string;
  group?: string;
}

interface CustomDropdownProps {
  id: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  showGroups?: boolean; // Option to show or hide group headers
  isProjectDropdown?: boolean; // New prop to identify if this is the Owner Project dropdown
  isChainDropdown?: boolean; // New prop to identify if this is a chain dropdown
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  required = false,
  className = '',
  error,
  showGroups = true,
  isProjectDropdown = false,
  isChainDropdown = false
}) => {
  const dropdownContext = useDropdownContext();
  // Fallback to local state if context is not available
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = dropdownContext ? dropdownContext.openDropdownId === id : localIsOpen;
  const [searchTerm, setSearchTerm] = useState('');
  const [showOrbitOnly, setShowOrbitOnly] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the selected option label
  const selectedOption = options.find(option => String(option.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Group options by their group property (if present)
  const groupedOptions = options.reduce((groups: Record<string, DropdownOption[]>, option) => {
    const group = option.group || 'Ungrouped';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(option);
    return groups;
  }, {});

  // Filter options based on search term and Orbit toggle
  const filteredOptions = options.filter(option => {
    // Filter by Orbit chains if toggle is enabled
    if (isChainDropdown && showOrbitOnly && !isOrbitChain(String(option.value))) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm.trim() === '') {
      return true;
    }
    
    return (
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (dropdownContext) {
          dropdownContext.setOpenDropdownId(null);
        } else {
          setLocalIsOpen(false);
        }
        setSearchTerm('');
        setShowOrbitOnly(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, dropdownContext]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle toggling the dropdown
  const toggleDropdown = () => {
    if (isOpen) {
      if (dropdownContext) {
        dropdownContext.setOpenDropdownId(null);
      } else {
        setLocalIsOpen(false);
      }
      setSearchTerm('');
      setShowOrbitOnly(false);
    } else {
      // Close any other open dropdowns first
      if (dropdownContext) {
        dropdownContext.setOpenDropdownId(id);
      } else {
        setLocalIsOpen(true);
      }
    }
  };

  // Render group headers or just the options
  const renderOptions = () => {
    if (!showGroups || Object.keys(groupedOptions).length <= 1) {
      // Just render all options if there are no groups or we don't want to show them
      return filteredOptions.map(option => renderOption(option));
    } else {
      // Render options with group headers
      return Object.entries(groupedOptions).map(([group, groupOptions]) => {
        // Filter options in this group
        const filteredGroupOptions = groupOptions.filter(option => 
          filteredOptions.some(fOption => String(fOption.value) === String(option.value))
        );
        
        // Only show groups that have options after filtering
        if (filteredGroupOptions.length === 0) return null;

        return (
          <div key={group}>
            <div className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
              {group}
            </div>
            {filteredGroupOptions.map(option => renderOption(option))}
          </div>
        );
      });
    }
  };

  // Render a single option
  const renderOption = (option: DropdownOption) => {
    const isOrbit = isChainDropdown && isOrbitChain(String(option.value));
    const isSelected = String(value) === String(option.value);
    
    return (
      <li
        key={String(option.value)}
        id={`${id}-option-${option.value}`}
        role="option"
        aria-selected={isSelected}
        className={`cursor-pointer select-none relative py-3 px-4 mx-1 rounded-lg transition-all duration-150 ${
          isSelected
            ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
            : 'hover:bg-gray-50 border border-transparent'
        }`}
        onClick={() => {
          onChange(String(option.value));
          if (dropdownContext) {
            dropdownContext.setOpenDropdownId(null);
          } else {
            setLocalIsOpen(false);
          }
          setSearchTerm('');
        }}
        title={option.description}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-semibold truncate ${
                isSelected ? 'text-indigo-700' : 'text-gray-900'
              }`}>
                {option.label}
              </span>
              {isOrbit && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0 ${
                  isSelected 
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm'
                }`}>
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.6"/>
                    <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="currentColor"/>
                  </svg>
                  Orbit
                </span>
              )}
              {isSelected && (
                <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {option.description && (
              <p className={`text-xs mt-1.5 leading-relaxed ${
                isSelected ? 'text-indigo-600' : 'text-gray-600'
              }`}>
                {option.description}
              </p>
            )}
          </div>
        </div>
      </li>
    );
  };

  // Render project not found message
  const renderProjectNotFound = () => (
    <div className="p-6 text-sm bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 mx-2">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 mb-2">
            Couldn&apos;t find your project?
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-1.5 mb-4 text-sm">
            <li>Check if you&apos;ve spelled the project name correctly</li>
            <li>Try searching by the project&apos;s GitHub name</li>
            <li>Search with different keywords related to your project</li>
          </ul>
          <p className="text-gray-700 mb-3 text-sm">
            If you still can&apos;t find your project, you can add it to our directory:
          </p>
          <Link 
            href="/project" 
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Project
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div className="relative">
        <button
          type="button"
          id={id}
          className={`w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'} py-3 pl-10 pr-4 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:text-sm text-gray-900 bg-white transition-all duration-200 flex items-center justify-between ${
            !selectedOption ? 'text-gray-400' : ''
          }`}
          onClick={toggleDropdown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <span className="block truncate pl-2">
            {displayText}
          </span>
          <span className="ml-2 pointer-events-none flex-shrink-0">
            <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
        </button>
      </div>

      {/* Hidden native select for form submission */}
      <select
        id={`${id}-native`}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="sr-only"
        aria-hidden="true"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(option => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Dropdown menu with absolute positioning */}
      {isOpen && (
        <div className="absolute z-[9999] mt-2 w-full">
          <div className="bg-white shadow-xl max-h-96 rounded-xl text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-100 w-full">
            {/* Search input and Orbit toggle - sticky at the top */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
              <div className="px-3 py-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {/* Orbit chains toggle - only show for chain dropdowns */}
              {isChainDropdown && (
                <div className="px-3 pb-2">
                  <label className="inline-flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showOrbitOnly}
                      onChange={(e) => {
                        setShowOrbitOnly(e.target.checked);
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="sr-only"
                    />
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      showOrbitOnly ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                        showOrbitOnly ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                    <span className="ml-2 text-xs font-medium text-gray-700 group-hover:text-gray-900">
                      Show Orbit chains only
                    </span>
                  </label>
                </div>
              )}
            </div>
            
            <ul tabIndex={-1} role="listbox" aria-labelledby={id} aria-activedescendant={value ? `${id}-option-${value}` : undefined} className="py-2">
              {filteredOptions.length === 0 ? (
                isProjectDropdown && searchTerm ? 
                renderProjectNotFound() : 
                <li className="px-4 py-6 text-gray-500 text-center text-sm">
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>No results found</span>
                  </div>
                </li>
              ) : (
                renderOptions()
              )}
            </ul>
          </div>
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default CustomDropdown;