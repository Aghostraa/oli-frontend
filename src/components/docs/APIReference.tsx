'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DocContent from './docsui/DocContent';
import { Play, CheckCircle2, XCircle, Loader2, Copy, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, OpenAPIPath>>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

interface OpenAPIPath {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    content?: {
      'application/json'?: {
        schema?: any;
      };
    };
    required?: boolean;
  };
  responses?: Record<string, {
    description?: string;
    content?: {
      'application/json'?: {
        schema?: any;
      };
    };
  }>;
}

interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema?: {
    type?: string;
    description?: string;
    default?: any;
    enum?: any[];
    pattern?: string;
  };
  description?: string;
}

interface TestResult {
  loading?: boolean;
  success?: boolean;
  status?: number;
  statusText?: string;
  responseTime?: number;
  data?: any;
  headers?: Record<string, string>;
  error?: string;
}

interface EndpointTesterProps {
  path: string;
  method: string;
  operation: OpenAPIPath;
  apiKey: string;
  spec: OpenAPISpec;
}

// Resolve schema references ($ref)
const resolveSchemaRef = (ref: string, spec: OpenAPISpec): any => {
  if (!ref || !ref.startsWith('#/components/schemas/')) {
    return null;
  }
  
  const schemaName = ref.replace('#/components/schemas/', '');
  return spec.components?.schemas?.[schemaName] || null;
};

// Resolve schema (handles $ref and direct schemas)
const resolveSchema = (schema: any, spec: OpenAPISpec): any => {
  if (!schema) return null;
  
  // If it's a reference, resolve it
  if (schema.$ref) {
    return resolveSchemaRef(schema.$ref, spec);
  }
  
  // If it has nested references, resolve them recursively
  if (schema.properties) {
    const resolved: any = { ...schema };
    resolved.properties = {};
    Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
      if (value.$ref) {
        resolved.properties[key] = resolveSchema(value, spec);
      } else if (value.items?.$ref) {
        resolved.properties[key] = {
          ...value,
          items: resolveSchema(value.items, spec),
        };
      } else {
        resolved.properties[key] = value;
      }
    });
    return resolved;
  }
  
  if (schema.items?.$ref) {
    return {
      ...schema,
      items: resolveSchema(schema.items, spec),
    };
  }
  
  return schema;
};

const EndpointTester: React.FC<EndpointTesterProps> = ({ path, method, operation, apiKey, spec }) => {
  const [params, setParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState<string>('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showSchemas, setShowSchemas] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleTest = async () => {
    setTestResult({ loading: true });

    try {
      let requestBody;
      if (body.trim()) {
        try {
          requestBody = JSON.parse(body);
        } catch {
          alert('Invalid JSON in request body');
          setTestResult(null);
          return;
        }
      }

      const response = await fetch('/api/proxy-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          path,
          params,
          headers: {
            'x-api-key': apiKey,
          },
          body: requestBody,
        }),
      });

      const result = await response.json();

      setTestResult({
        loading: false,
        success: result.success,
        status: result.status,
        statusText: result.statusText,
        responseTime: result.responseTime,
        data: result.data,
        headers: result.headers,
        error: result.error,
      });
    } catch (err: any) {
      setTestResult({
        loading: false,
        success: false,
        error: err.message,
      });
    }
  };

  const isProtected = operation.security && operation.security.length > 0;

  // Get resolved request body schema
  const requestBodySchema = useMemo(() => {
    if (!operation.requestBody?.content?.['application/json']?.schema) return null;
    return resolveSchema(operation.requestBody.content['application/json'].schema, spec);
  }, [operation.requestBody, spec]);

  // Get resolved response schema
  const responseSchema = useMemo(() => {
    const successResponse = operation.responses?.['200'];
    if (!successResponse?.content?.['application/json']?.schema) return null;
    return resolveSchema(successResponse.content['application/json'].schema, spec);
  }, [operation.responses, spec]);

  // Generate example URL
  const generateExampleUrl = () => {
    const baseUrl = 'https://api.openlabelsinitiative.org';
    const url = new URL(`${baseUrl}${path}`);
    
    operation.parameters?.forEach((param) => {
      if (param.in === 'query') {
        if (param.schema?.default !== undefined) {
          url.searchParams.append(param.name, String(param.schema.default));
        } else if (param.required) {
          if (param.name === 'address') {
            url.searchParams.append(param.name, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
          } else if (param.name === 'tag_id') {
            url.searchParams.append(param.name, 'usage_category');
          } else if (param.name === 'tag_value') {
            url.searchParams.append(param.name, 'dex');
          } else if (param.name === 'limit') {
            url.searchParams.append(param.name, String(param.schema?.default || 100));
          }
        }
      }
    });
    
    return url.toString();
  };

  // Generate cURL example
  const generateCurlExample = () => {
    const baseUrl = 'https://api.openlabelsinitiative.org';
    let curl = `curl -X ${method} "${baseUrl}${path}`;
    
    const queryParams: string[] = [];
    operation.parameters?.forEach((param) => {
      if (param.in === 'query') {
        let value = '';
        if (param.schema?.default !== undefined) {
          value = String(param.schema.default);
        } else if (param.required) {
          if (param.name === 'address') {
            value = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
          } else if (param.name === 'tag_id') {
            value = 'usage_category';
          } else if (param.name === 'tag_value') {
            value = 'dex';
          }
        }
        if (value) {
          queryParams.push(`${param.name}=${encodeURIComponent(value)}`);
        }
      }
    });
    
    if (queryParams.length > 0) {
      curl += `?${queryParams.join('&')}`;
    }
    curl += '"';
    
    if (isProtected && apiKey) {
      curl += ` \\\n  -H "x-api-key: ${apiKey}"`;
    }
    curl += ` \\\n  -H "Content-Type: application/json"`;
    
    if (requestBodySchema && method !== 'GET') {
      const exampleBody = generateExampleFromSchema(requestBodySchema);
      curl += ` \\\n  -d '${JSON.stringify(exampleBody, null, 2)}'`;
    }
    
    return curl;
  };

  // Generate example from resolved schema
  const generateExampleFromSchema = (schema: any): any => {
    if (!schema) return {};
    
    if (schema.properties) {
      const example: any = {};
      Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
        if (value.type === 'string') {
          example[key] = value.example || `example_${key}`;
        } else if (value.type === 'number' || value.type === 'integer') {
          example[key] = value.example !== undefined ? value.example : 0;
        } else if (value.type === 'boolean') {
          example[key] = value.example !== undefined ? value.example : false;
        } else if (value.type === 'array') {
          if (value.items) {
            const itemExample = generateExampleFromSchema(value.items);
            example[key] = value.example || [itemExample];
          } else {
            example[key] = value.example || [];
          }
        } else if (value.type === 'object' || value.properties) {
          example[key] = generateExampleFromSchema(value);
        } else if (value.anyOf) {
          example[key] = generateExampleFromSchema(value.anyOf[0]);
        } else if (value.$ref) {
          const resolved = resolveSchema(value, spec);
          example[key] = generateExampleFromSchema(resolved);
        }
      });
      return example;
    }
    
    if (schema.type === 'array' && schema.items) {
      return [generateExampleFromSchema(schema.items)];
    }
    
    return {};
  };

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <DocContent>
      <div className="p-6 space-y-4">
          {/* Collapsible Endpoint Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-start justify-between text-left hover:bg-gray-50 -m-4 p-4 rounded-lg transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-3 py-1 rounded font-semibold text-sm ${
                    method === 'GET'
                      ? 'bg-blue-100 text-blue-700'
                      : method === 'POST'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {method}
                </span>
                <code className="text-lg font-mono text-gray-900">{path}</code>
                {isProtected ? (
                  <span title="Protected endpoint">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </span>
                ) : (
                  <span title="Unprotected endpoint">
                    <Unlock className="w-4 h-4 text-gray-400" />
                  </span>
                )}
              </div>
              {operation.summary && (
                <p className="text-gray-700 font-medium">{operation.summary}</p>
              )}
              {operation.description && (
                <p className="text-sm text-gray-600 mt-1">{operation.description}</p>
              )}
            </div>
            <div className="ml-4">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {/* Expanded Content */}
          {isExpanded && (
            <>
              {/* Examples Toggle */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowExamples(!showExamples)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {showExamples ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Examples
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show Examples
                    </>
                  )}
                </button>
              </div>

              {/* Examples Section */}
              {showExamples && (
                <div className="border-t pt-4 space-y-4">
                  {/* Example URL */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">Example URL</h4>
                      <button
                        onClick={() => handleCopy(generateExampleUrl(), 'url')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy URL"
                      >
                        <Copy className={`w-4 h-4 ${copied === 'url' ? 'text-green-600' : 'text-gray-600'}`} />
                      </button>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <code className="text-sm text-gray-900 break-all">{generateExampleUrl()}</code>
                    </div>
                  </div>

                  {/* cURL Example */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">cURL Example</h4>
                      <button
                        onClick={() => handleCopy(generateCurlExample(), 'curl')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy cURL"
                      >
                        <Copy className={`w-4 h-4 ${copied === 'curl' ? 'text-green-600' : 'text-gray-600'}`} />
                      </button>
                    </div>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-xs text-gray-900">
                      {generateCurlExample()}
                    </pre>
                  </div>

                  {/* Example Response */}
                  {responseSchema && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Example Response</h4>
                      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-xs text-gray-900">
                        {JSON.stringify(generateExampleFromSchema(responseSchema), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Schemas Toggle */}
              {(requestBodySchema || responseSchema) && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowSchemas(!showSchemas)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    {showSchemas ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide Schemas
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show Schemas
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Schemas Section */}
              {showSchemas && (
                <div className="border-t pt-4 space-y-4">
                  {/* Request Body Schema */}
                  {requestBodySchema && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Request Body Schema</h4>
                      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-xs text-gray-900">
                        {JSON.stringify(requestBodySchema, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Response Schema */}
                  {responseSchema && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Response Schema</h4>
                      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-xs text-gray-900">
                        {JSON.stringify(responseSchema, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Parameters */}
              {operation.parameters && operation.parameters.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Parameters</h4>
                  <div className="space-y-3">
                    {operation.parameters.map((param) => (
                      <div key={param.name} className="flex gap-4">
                        <div className="w-32 flex-shrink-0">
                          <code className="text-sm font-mono text-gray-900">{param.name}</code>
                          {param.required && (
                            <span className="ml-2 text-red-500 text-xs">*</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder={
                              param.schema?.default !== undefined
                                ? `Default: ${param.schema.default}`
                                : param.description || param.name
                            }
                            value={params[param.name] || ''}
                            onChange={(e) =>
                              setParams({ ...params, [param.name]: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white placeholder:text-gray-500"
                          />
                          {param.description && (
                            <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Body */}
              {operation.requestBody && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Request Body</h4>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter JSON request body..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-gray-900 bg-white placeholder:text-gray-500"
                  />
                </div>
              )}

              {/* Test Button */}
              <div className="border-t pt-4">
                <button
                  onClick={handleTest}
                  disabled={testResult?.loading || (isProtected && !apiKey)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {testResult?.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Test Endpoint
                    </>
                  )}
                </button>
              </div>

              {/* Test Results */}
              {testResult && !testResult.loading && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          Success ({testResult.status}) - {testResult.responseTime}ms
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-semibold text-red-700">
                          Error {testResult.status || testResult.error}
                        </span>
                      </>
                    )}
                  </div>
                  {testResult.data && (
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-xs text-gray-900">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  )}
                  {testResult.error && (
                    <p className="text-sm text-red-600">{testResult.error}</p>
                  )}
                </div>
              )}
            </>
          )}
      </div>
    </DocContent>
  );
};

const APIReference: React.FC = () => {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const storedKey = sessionStorage.getItem('api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }

    fetch('/api/openapi-spec')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        setSpec(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleGetApiKey = () => {
    window.location.href = '/developer';
  };

  const categories = useMemo(() => {
    if (!spec) return {};
    
    const categories: Record<string, Array<{
      path: string;
      method: string;
      operation: OpenAPIPath;
    }>> = {};

    // Filter out admin endpoints and health check endpoints
    const excludedPaths = ['/healthz', '/readyz'];
    const isAdminPath = (path: string) => path.startsWith('/keys');

    Object.entries(spec.paths).forEach(([path, methods]) => {
      // Skip admin endpoints and health check endpoints
      if (excludedPaths.includes(path) || isAdminPath(path)) {
        return;
      }

      Object.entries(methods).forEach(([method, operation]) => {
        // Skip admin endpoints based on tags
        if (operation.tags?.includes('Admin')) {
          return;
        }

        // Get the first tag or use 'default' as fallback
        const category = operation.tags?.[0] || 'default';
        
        if (!categories[category]) {
          categories[category] = [];
        }
        
        categories[category].push({ 
          path, 
          method: method.toUpperCase(), 
          operation 
        });
      });
    });

    // Sort endpoints within each category
    Object.keys(categories).forEach(category => {
      categories[category].sort((a, b) => a.path.localeCompare(b.path));
    });

    return categories;
  }, [spec]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Initialize expanded categories when categories are loaded
  useEffect(() => {
    if (Object.keys(categories).length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(Object.keys(categories)));
    }
  }, [categories, expandedCategories.size]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Failed to load API specification: {error}</p>
      </div>
    );
  }

  return (
    <>
      {/* API Key Input Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                sessionStorage.setItem('api_key', e.target.value);
              }}
              placeholder="Enter your API key (oli_...)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder:text-gray-500"
            />
            <p className="mt-2 text-sm text-gray-600">
              Don&apos;t have an API key?{' '}
              <button
                onClick={handleGetApiKey}
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                Get one here
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Endpoints List - Grouped by Category */}
      <div className="space-y-6">
        {Object.entries(categories).map(([category, endpoints]) => (
          <div key={category}>
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between text-left mb-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <h2 className="text-xl font-bold text-gray-900">{category}</h2>
              {expandedCategories.has(category) ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Category Endpoints */}
            {expandedCategories.has(category) && (
              <div className="space-y-4">
                {endpoints.map(({ path, method, operation }) => (
                  <EndpointTester
                    key={`${method}:${path}`}
                    path={path}
                    method={method}
                    operation={operation}
                    apiKey={apiKey}
                    spec={spec}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default APIReference;
