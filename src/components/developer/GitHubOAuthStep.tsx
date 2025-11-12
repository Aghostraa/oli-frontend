'use client';

import React, { useState } from 'react';
import { Github, CheckCircle2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface GitHubOAuthStepProps {
  isConnected: boolean;
  githubUsername?: string | null;
  githubName?: string | null;
}

/**
 * Step 1: GitHub OAuth Connection
 * User connects their GitHub account via custom OAuth flow
 */
const GitHubOAuthStep: React.FC<GitHubOAuthStepProps> = ({ 
  isConnected,
  githubUsername,
  githubName,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectGitHub = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Redirect to our OAuth initiation endpoint
      window.location.href = '/api/developer/github/oauth';
    } catch (err: any) {
      console.error('Failed to initiate GitHub OAuth:', err);
      setError(err.message || 'Failed to connect GitHub. Please try again.');
      setIsLoading(false);
    }
  };

  if (isConnected && githubUsername) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">GitHub Connected</h3>
            <div className="flex items-center gap-2 mt-1">
              <Github className="w-4 h-4 text-gray-600" />
              <p className="text-sm text-gray-600">{githubName || githubUsername}</p>
              <span className="text-xs text-gray-400">(@{githubUsername})</span>
              <a
                href={`https://github.com/${githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 ml-2"
              >
                <ExternalLink className="w-4 h-4 inline-block" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-gray-900 p-3 rounded-xl">
          <Github className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Step 1: Connect GitHub Account
          </h3>
          <p className="text-sm text-gray-600">
            Connect your GitHub account to verify your developer identity. This helps us verify you&apos;re a real developer.
          </p>
        </div>
      </div>

      <button
        onClick={handleConnectGitHub}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Redirecting to GitHub...
          </>
        ) : (
          <>
            <Github className="w-5 h-5" />
            Connect GitHub Account
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 text-center">
        We&apos;ll only access your public profile information. You can revoke access anytime in your GitHub settings.
      </p>
    </div>
  );
};

export default GitHubOAuthStep;
