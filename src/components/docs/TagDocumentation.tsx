import React, { useState, useEffect } from 'react';
import yaml from 'js-yaml';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  DocHeader,
  DocContent,
  LoadingSpinner,
  ErrorDisplay,
  ActionButton,
  SearchFilter,
  TagCard,
  SchemaDisplay,
  InfoSection
} from './docsui/index';

interface TagSchema {
  type: string;
  enum?: string[];
  items?: {
    type: string;
    enum?: string[];
    required?: string[];
    properties?: Record<string, any>;
  };
  format?: string;
  minLength?: number;
  maxLength?: number;
  required?: string[];
  properties?: Record<string, any>;
}

interface TagDefinition {
  tag_id: string;
  name: string;
  description: string;
  schema: TagSchema;
  creator: string;
}

interface Category {
  category_id: string;
  name: string;
  description: string;
  examples?: string;
}

interface TagDefinitionsYaml {
  version: string;
  tags: TagDefinition[];
}

interface CategoryDefinitionsYaml {
  version: string;
  categories: Category[];
}

interface CategoryGroup {
  name: string;
  categories: Category[];
}



// Schema formatting functions moved to ui/SchemaDisplay.tsx



const formatExamples = (examples?: string) => {
  if (!examples) return null;
  
  return examples.split('\n').map((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('-')) {
      // Check if line contains a URL
      const urlMatch = trimmedLine.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const [url] = urlMatch;
        const text = trimmedLine.replace(url, '').replace('-', '').trim();
        return (
          <li key={index} className="ml-4 list-disc">
            {text}
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 ml-1"
            >
              {new URL(url).hostname}
            </a>
          </li>
        );
      }
      return <li key={index} className="ml-4 list-disc">{trimmedLine.substring(1).trim()}</li>;
    }
    return <p key={index} className="mb-2">{trimmedLine}</p>;
  });
};

interface TagDocumentationProps {
  showHeader?: boolean;
}

const TagDocumentation: React.FC<TagDocumentationProps> = ({ showHeader = true }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);

  // Check for URL parameters to auto-expand usage category
  useEffect(() => {
    const viewUsageCategory = searchParams.get('viewUsageCategory');
    if (viewUsageCategory === 'true' && !loading) {
      // Clear any existing filters
      setSelectedType(null);
      setSelectedCreator(null);
      
      // Set the search term and expand categories
      setExpandedCategories(true);
      setSearchTerm('usage_category');
      
      // Clear the URL parameter after processing to avoid re-triggering
      const params = new URLSearchParams(searchParams.toString());
      params.delete('viewUsageCategory');
      router.replace(`?${params.toString()}`, { scroll: false });
      
      // Scroll to usage_category after a delay to ensure content is rendered
      setTimeout(() => {
        const usageCategoryElement = document.getElementById('tag-usage_category');
        if (usageCategoryElement) {
          usageCategoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 600);
    }
  }, [searchParams, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tagResponse, categoryResponse] = await Promise.all([
          fetch('https://raw.githubusercontent.com/openlabelsinitiative/OLI/main/1_label_schema/tags/tag_definitions.yml'),
          fetch('https://raw.githubusercontent.com/openlabelsinitiative/OLI/main/1_label_schema/tags/valuesets/usage_category.yml')
        ]);

        const [tagText, categoryText] = await Promise.all([
          tagResponse.text(),
          categoryResponse.text()
        ]);

        const tagData = yaml.load(tagText) as TagDefinitionsYaml;
        const categoryData = yaml.load(categoryText) as CategoryDefinitionsYaml;

        // Parse category groups from YAML comments
        const lines = categoryText.split('\n');
        const groups: CategoryGroup[] = [];

        // First pass: find all group headers and their line numbers
        const groupHeaders = lines.reduce((acc, line, index) => {
          const groupMatch = line.match(/^[\s]*#[\s]*(.*Categories)[\s]*$/);
          if (groupMatch) {
            acc.push({
              name: groupMatch[1].trim(),
              lineNumber: index
            });
          }
          return acc;
        }, [] as Array<{ name: string; lineNumber: number }>);

        // If no group headers found, create a default group with all categories
        if (groupHeaders.length === 0) {
          groups.push({
            name: 'All Categories',
            categories: categoryData.categories || []
          });
        } else {
          // Second pass: associate categories with their groups
          categoryData.categories.forEach(category => {
            const categoryLine = lines.findIndex(line => line.includes(`category_id: ${category.category_id}`));
            
            // Find the appropriate group for this category
            const groupIndex = groupHeaders.findIndex((header, index) => {
              const nextHeader = groupHeaders[index + 1];
              return categoryLine > header.lineNumber && 
                     (!nextHeader || categoryLine < nextHeader.lineNumber);
            });

            if (groupIndex >= 0) {
              const groupName = groupHeaders[groupIndex].name;
              const existingGroup = groups.find(g => g.name === groupName);
              if (existingGroup) {
                existingGroup.categories.push(category);
              } else {
                groups.push({
                  name: groupName,
                  categories: [category]
                });
              }
            }
          });
        }

        setTagDefinitions(tagData.tags || []);
        setCategoryGroups(groups);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load documentation. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const uniqueTypes = Array.from(new Set(tagDefinitions.map(tag => tag.schema.type)));
  const uniqueCreators = Array.from(new Set(tagDefinitions.map(tag => tag.creator)));

  const filteredTags = tagDefinitions.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.tag_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || tag.schema.type === selectedType;
    const matchesCreator = !selectedCreator || tag.creator === selectedCreator;

    return matchesSearch && matchesType && matchesCreator;
  });

  const renderCategoryGroup = (group: CategoryGroup) => (
    <div key={group.name} className="border border-gray-100 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">{group.name}</h4>
      <div className="space-y-4">
        {group.categories.map(category => (
          <div key={category.category_id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h5 className="text-sm font-medium text-gray-900">{category.name}</h5>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                {category.category_id}
              </code>
            </div>
            <p className="text-sm text-gray-600 mb-2">{category.description}</p>
            {category.examples && (
              <div className="mt-2">
                <h6 className="text-xs font-medium text-gray-700 mb-1">Examples:</h6>
                <div className="text-xs text-gray-600">
                  {formatExamples(category.examples)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTagContent = (tag: TagDefinition) => {
    if (tag.tag_id === 'usage_category') {
      return (
        <div>
          <p className="text-gray-600 mb-3">{tag.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <SchemaDisplay schema={tag.schema} />
            <ActionButton
              onClick={() => setExpandedCategories(!expandedCategories)}
              variant="secondary"
              size="sm"
              icon={
                <svg
                  className={`w-4 h-4 transform transition-transform ${
                    expandedCategories ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              }
              className="bg-green-50 text-green-700 hover:bg-green-100"
            >
              {expandedCategories ? 'Hide Categories' : 'View Categories'}
            </ActionButton>
          </div>
          {expandedCategories && (
            <div className="mt-4 space-y-6">
              {categoryGroups.map(renderCategoryGroup)}
            </div>
          )}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700">
              Valid values defined in:{' '}
              <a 
                href="https://github.com/openlabelsinitiative/OLI/blob/main/1_label_schema/tags/valuesets/usage_category.yml"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-blue-800"
              >
                usage_category.yml
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (tag.tag_id === 'owner_project') {
      return (
        <div>
          <p className="text-gray-600 mb-3">{tag.description}</p>
          <SchemaDisplay schema={tag.schema} className="mb-4" />

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700">
              For the complete list of valid project names, see:{' '}
              <a 
                href="https://github.com/opensource-observer/oss-directory/tree/main/data/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-blue-800"
              >
                OSS Directory Projects
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <p className="text-gray-600 mb-3">{tag.description}</p>
        <SchemaDisplay schema={tag.schema} />
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="We are updating the docs to the latest version..." size="lg" className="min-h-[400px]" />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <div className={showHeader ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" : ""}>
      {showHeader && (
        <DocContent className="mb-8">
          <DocHeader
            title="Data Model Documentation"
            description="The Open Labels Initiative provides a standardized framework for labeling blockchain addresses."
            actions={
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
            }
          />
          <InfoSection
            title="Core Components"
            items={[
              { label: 'address', description: 'Hexadecimal public address of a smart contract or EOA' },
              { label: 'chain_id', description: 'CAIP-2 identifier (includes EIP-155)' },
              { label: 'tag_id', description: 'Unique identifier for the tag type. Multiple tags can be applied to the same address+chain combination.' },
              { label: 'value', description: 'The specific content/value assigned to the tag for this address' }
            ]}
          />
        </DocContent>
      )}

      {/* Search and Filters */}
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tags..."
        filters={[
          {
            label: "All Types",
            value: selectedType,
            onChange: setSelectedType,
            options: uniqueTypes.map(type => ({ value: type, label: type }))
          },
          {
            label: "All Creators", 
            value: selectedCreator,
            onChange: setSelectedCreator,
            options: uniqueCreators.map(creator => ({ value: creator, label: creator }))
          }
        ]}
        className="mb-6"
      />

      {/* Content Area */}
      <div className="space-y-6">
        <div className="grid gap-6">
          {filteredTags.map((tag) => (
            <div key={tag.tag_id} id={`tag-${tag.tag_id}`}>
              <TagCard
                title={tag.name}
                tagId={tag.tag_id}
                type={tag.schema.type}
                creator={tag.creator}
              >
                {renderTagContent(tag)}
              </TagCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagDocumentation; 
