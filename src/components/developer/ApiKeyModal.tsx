'use client';

import React, { useState } from 'react';
import { X, Copy, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  apiKey: string;
  keyId: string;
  onClose: () => void;
}

/**
 * Modal component to display newly created API key
 * Warns user to save it as they won't see it again
 */
const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  apiKey,
  keyId,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy API key:', err);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(keyId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Failed to copy key ID:', err);
    }
  };

  const handleCopyAll = async () => {
    const fullText = `API Key ID: ${keyId}\nAPI Key: ${apiKey}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setCopiedId(true);
      setTimeout(() => {
        setCopied(false);
        setCopiedId(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  API Key Generated Successfully!
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6">
            {/* Warning Banner */}
            <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">
                  ⚠️ Save This Key Now!
                </h4>
                <p className="text-sm text-amber-800">
                  This is the <strong>only time</strong> you will see your full API key. 
                  Save it securely before closing this window. If you lose it, you&apos;ll need to create a new one.
                </p>
              </div>
            </div>

            {/* Key ID */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                API Key ID
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl font-mono text-sm text-gray-900 break-all">
                  {keyId}
                </div>
                <button
                  onClick={handleCopyId}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2"
                  title="Copy Key ID"
                >
                  {copiedId ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* API Key */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                API Key
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-gray-50 border-2 border-blue-300 rounded-xl font-mono text-sm text-gray-900 break-all">
                  {apiKey}
                </div>
                <button
                  onClick={handleCopyKey}
                  className="px-4 py-3 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors flex items-center gap-2"
                  title="Copy API Key"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Copy All Button */}
            <div className="mb-6">
              <button
                onClick={handleCopyAll}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:via-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Copy className="w-5 h-5" />
                Copy Both Key ID and API Key
              </button>
            </div>

            {/* Security Tips */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Security Best Practices:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Store your API key in a secure password manager</li>
                <li>Never commit API keys to version control</li>
                <li>Use environment variables in your applications</li>
                <li>Rotate keys regularly for better security</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              I&apos;ve Saved My Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;

