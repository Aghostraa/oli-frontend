'use client';

import React from 'react';
import { CheckCircle2, ExternalLink, BookOpen, Key, AlertCircle } from 'lucide-react';

/**
 * API Key Success Component
 * Shows success message and next steps after API key creation
 */
const ApiKeySuccess: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          API Key Generated Successfully!
        </h3>
        <p className="text-gray-600">
          Your API key has been created and displayed in the modal above. Make sure to save it securely.
        </p>
      </div>

      {/* Next Steps */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h4>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-gray-900 mb-1">Read the Documentation</h5>
              <p className="text-sm text-gray-600 mb-2">
                Learn how to use your API key to query labels and integrate with the OLI API.
              </p>
              <a
                href="/docs"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
              >
                View Documentation <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <Key className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-gray-900 mb-1">Start Using Your API Key</h5>
              <p className="text-sm text-gray-600 mb-2">
                Include your API key in the <code className="px-1.5 py-0.5 bg-white rounded text-xs font-mono">x-api-key</code> header when making requests.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Important Security Reminder</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Never share your API key publicly or commit it to version control</li>
              <li>Use environment variables to store API keys in your applications</li>
              <li>If your key is compromised, you&apos;ll need to create a new one</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h4>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/docs"
            className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-sm text-gray-700"
          >
            <ExternalLink className="w-4 h-4" />
            API Documentation
          </a>
          <a
            href="https://github.com/openlabelsinitiative/OLI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-sm text-gray-700"
          >
            <ExternalLink className="w-4 h-4" />
            GitHub Repository
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySuccess;

