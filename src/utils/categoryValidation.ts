// src/utils/categoryValidation.ts
import { ValidationWarning } from '../types/attestation';
import { CATEGORIES, VALID_CATEGORY_IDS } from '../constants/categories';

// Calculate Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

// Get smart category suggestions based on user input
export const getSmartCategorySuggestions = (value: string): string[] => {
  if (!value) return [];
  
  const normalizedValue = value.toLowerCase().trim();
  const suggestions: { category: string; score: number }[] = [];
  
  // Get all categories with their display names
  const allCategories = CATEGORIES.flatMap(mainCategory => 
    mainCategory.categories.map(category => ({
      id: category.category_id,
      name: category.name.toLowerCase(),
      description: category.description.toLowerCase(),
      mainCategory: mainCategory.main_category_name.toLowerCase()
    }))
  );
  
  allCategories.forEach(category => {
    let score = 0;
    
    // Exact match with category ID (highest priority)
    if (category.id === normalizedValue) {
      score = 100;
    }
    // Exact match with category name
    else if (category.name === normalizedValue) {
      score = 95;
    }
    // Contains match in category name
    else if (category.name.includes(normalizedValue) || normalizedValue.includes(category.name)) {
      const lengthRatio = Math.min(category.name.length, normalizedValue.length) / 
                         Math.max(category.name.length, normalizedValue.length);
      if (lengthRatio > 0.4) {
        score = 80 + (lengthRatio * 15);
      }
    }
    // Contains match in description
    else if (category.description.includes(normalizedValue)) {
      score = 70;
    }
    // Contains match in main category
    else if (category.mainCategory.includes(normalizedValue) || normalizedValue.includes(category.mainCategory)) {
      score = 60;
    }
    // Levenshtein distance for close typos (category name)
    else {
      const distance = levenshteinDistance(normalizedValue, category.name);
      const maxLength = Math.max(normalizedValue.length, category.name.length);
      const similarity = 1 - (distance / maxLength);
      
      if (similarity > 0.6) { // 60% similarity threshold
        score = similarity * 75;
      }
      
      // Also check category ID for typos
      const idDistance = levenshteinDistance(normalizedValue, category.id);
      const idMaxLength = Math.max(normalizedValue.length, category.id.length);
      const idSimilarity = 1 - (idDistance / idMaxLength);
      
      if (idSimilarity > 0.6) {
        score = Math.max(score, idSimilarity * 80);
      }
    }
    
    if (score > 50) { // Only include good matches
      suggestions.push({ category: category.id, score });
    }
  });
  
  // Sort by score and return top 5 suggestions
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.category);
};

// Check if a category value might be a common alias or misspelling
const getCategoryAliases = (): { [key: string]: string } => {
  return {
    // Common aliases and misspellings
    'defi': 'dex', // Most common DeFi category
    'exchange': 'dex',
    'swap': 'dex',
    'uniswap': 'dex',
    'nft': 'non_fungible_tokens',
    'erc721': 'non_fungible_tokens',
    'erc1155': 'non_fungible_tokens',
    'token': 'fungible_tokens',
    'erc20': 'fungible_tokens',
    'stable': 'stablecoin',
    'usdc': 'stablecoin',
    'usdt': 'stablecoin',
    'game': 'gaming',
    'vote': 'governance',
    'dao': 'governance',
    'yield': 'yield_vaults',
    'farm': 'yield_vaults',
    'vault': 'yield_vaults',
    'loan': 'lending',
    'borrow': 'lending',
    'stake': 'staking',
    'bridge': 'bridge',
    'crosschain': 'cc_communication',
    'cross-chain': 'cc_communication',
    'oracle': 'oracle',
    'insurance': 'insurance',
    'privacy': 'privacy',
    'identity': 'identity',
    'payment': 'payments',
    'donation': 'donation',
    'airdrop': 'airdrop',
    'exploit': 'cybercrime',
    'hack': 'cybercrime',
    'scam': 'cybercrime',
    'mev': 'mev',
    'arbitrage': 'mev',
    'bot': 'mev',
    'derivative': 'derivative',
    'futures': 'derivative',
    'options': 'derivative',
    'perp': 'derivative',
    'perpetual': 'derivative',
    'index': 'index',
    'etf': 'index',
    'marketplace': 'nft_marketplace',
    'opensea': 'nft_marketplace',
    'mint': 'nft_marketplace',
    'gambling': 'gambling',
    'bet': 'gambling',
    'lottery': 'gambling',
    'community': 'community',
    'social': 'community',
    'middleware': 'middleware',
    'abstraction': 'erc4337',
    'aa': 'erc4337',
    'inscription': 'inscriptions',
    'ordinal': 'inscriptions',
    'depin': 'depin',
    'infrastructure': 'depin',
    'developer': 'developer_tools',
    'tool': 'developer_tools',
    'dev': 'developer_tools',
    'custody': 'custody',
    'custodial': 'custody',
    'rwa': 'rwa',
    'real-world': 'rwa',
    'asset': 'rwa',
    'cex': 'cex',
    'centralized': 'cex',
    'settlement': 'settlement',
    'da': 'settlement',
    'l2': 'settlement',
    'layer2': 'settlement',
    'rollup': 'settlement',
    'deployment': 'contract_deplyoment',
    'deploy': 'contract_deplyoment',
    'factory': 'contract_deplyoment',
    'other': 'other',
    'misc': 'other',
    'miscellaneous': 'other',
    'unknown': 'other'
  };
};

// Convert common aliases to proper category IDs
export const convertCategoryAlias = (value: string): string => {
  if (!value) return value;
  
  const normalizedValue = value.toLowerCase().trim();
  const aliases = getCategoryAliases();
  
  // Check direct aliases first
  if (aliases[normalizedValue]) {
    return aliases[normalizedValue];
  }
  
  // If it's already a valid category ID, return it
  if (VALID_CATEGORY_IDS.includes(value)) {
    return value;
  }
  
  return value; // Return original if no conversion found
};

// Validate category field and provide suggestions
export const validateCategoryField = async (field: string, value: string): Promise<ValidationWarning[]> => {
  if (!value || field !== 'usage_category') return [];

  const warnings: ValidationWarning[] = [];
  
  // Check if it's a valid category ID
  if (!VALID_CATEGORY_IDS.includes(value)) {
    // Try to convert common aliases
    const convertedValue = convertCategoryAlias(value);
    
    if (convertedValue !== value && VALID_CATEGORY_IDS.includes(convertedValue)) {
      // Suggest the converted value
      warnings.push({
        message: `"${value}" might be "${convertedValue}". Click to apply the suggestion.`,
        suggestions: [convertedValue],
        isConversion: true
      });
    } else {
      // Get smart suggestions for invalid categories
      const smartSuggestions = getSmartCategorySuggestions(value);
      
      if (smartSuggestions.length > 0) {
        warnings.push({
          message: `Invalid category: "${value}". Did you mean one of these?`,
          suggestions: smartSuggestions
        });
      } else {
        warnings.push({
          message: `Invalid category: "${value}". Please select from the available categories.`,
          suggestions: ['other'] // Fallback to 'other' category
        });
      }
    }
  }
  
  return warnings;
};

// Get category display info for UI
export const getCategoryDisplayInfo = (categoryId: string): { name: string; description: string; mainCategory: string } | null => {
  // Find category in CATEGORIES
  for (const mainCategory of CATEGORIES) {
    const category = mainCategory.categories.find(cat => cat.category_id === categoryId);
    if (category) {
      return {
        name: category.name,
        description: category.description,
        mainCategory: mainCategory.main_category_name
      };
    }
  }
  return null;
};

// Get all categories grouped by main category for dropdowns
export const getCategoriesGrouped = () => {
  return CATEGORIES.map(mainCategory => ({
    label: mainCategory.main_category_name,
    options: mainCategory.categories.map(category => ({
      value: category.category_id,
      label: category.name,
      description: category.description
    }))
  }));
};