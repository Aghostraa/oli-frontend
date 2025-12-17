'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GitHubOAuthStep from '@/components/developer/GitHubOAuthStep';
import QuestionnaireStep, { QuestionnaireData } from '@/components/developer/QuestionnaireStep';
import ApiKeySuccess from '@/components/developer/ApiKeySuccess';
import ApiKeyModal from '@/components/developer/ApiKeyModal';
import { CheckCircle2 } from 'lucide-react';

/**
 * Main Developer Onboarding Page Content
 * Guides developers through GitHub OAuth, questionnaire, and API key generation
 */
const DeveloperPageContent = () => {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubName, setGithubName] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<{ apiKey: string; keyId: string } | null>(null);

  const steps = [
    { id: 1, title: 'Connect GitHub', description: 'Link your GitHub account' },
    { id: 2, title: 'Complete Profile', description: 'Fill out questionnaire' },
    { id: 3, title: 'Get API Key', description: 'Receive your credentials' },
  ];

  // Check URL parameters for OAuth callback result (moved from GitHubOAuthStep)
  React.useEffect(() => {
    if (!searchParams) {
      return;
    }

    const githubConnected = searchParams.get('github_connected');
    const username = searchParams.get('github_username');
    const name = searchParams.get('github_name');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      // Handle error - could show a toast or error message
      return;
    }

    if (githubConnected === 'true' && username && !githubUsername) {
      setGithubUsername(username);
      setGithubName(name || username);
      setCurrentStep(2);
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem('github_username', username);
      sessionStorage.setItem('github_name', name || username);
      sessionStorage.setItem('github_connected', 'true');
      
      // Clean up URL parameters
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('github_connected');
        url.searchParams.delete('github_username');
        url.searchParams.delete('github_name');
        url.searchParams.delete('error');
        url.searchParams.delete('message');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, githubUsername]);

  // Check sessionStorage for existing GitHub connection
  React.useEffect(() => {
    const storedUsername = sessionStorage.getItem('github_username');
    const storedName = sessionStorage.getItem('github_name');
    const isConnected = sessionStorage.getItem('github_connected') === 'true';
    
    if (isConnected && storedUsername && !githubUsername) {
      setGithubUsername(storedUsername);
      setGithubName(storedName || storedUsername);
      setCurrentStep(2);
    }
  }, [githubUsername]);

  const handleQuestionnaireSubmit = async (data: QuestionnaireData) => {
    try {
      const response = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to generate API key';
        const errorDetails = errorData.details ? ` Details: ${errorData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      const result = await response.json();
      
      // Store API key in sessionStorage temporarily
      if (result.apiKey?.apiKey) {
        sessionStorage.setItem('api_key', result.apiKey.apiKey);
        sessionStorage.setItem('api_key_id', result.apiKey.id);
        
        // Show modal with the new API key
        setNewApiKey({
          apiKey: result.apiKey.apiKey,
          keyId: result.apiKey.id,
        });
        setShowApiKeyModal(true);
      }
      
      setCurrentStep(3);
    } catch (error: any) {
      console.error('Failed to generate API key:', error);
      alert(error.message || 'Failed to generate API key. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Developer API Access
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get your API key to start building with the Open Labels Initiative API. 
            Complete the steps below to receive your developer credentials.
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 mb-2 transition-all duration-300 ${
                      currentStep > step.id
                        ? 'bg-green-100 border-green-500 text-green-600'
                        : currentStep === step.id
                        ? 'bg-blue-100 border-blue-500 text-blue-600'
                        : 'bg-gray-50 border-gray-300 text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-semibold ${
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs mt-1 ${
                      currentStep >= step.id ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="space-y-6">
          {currentStep === 1 && (
            <GitHubOAuthStep
              isConnected={!!githubUsername}
              githubUsername={githubUsername}
              githubName={githubName}
            />
          )}

          {currentStep === 2 && githubUsername && githubName && (
            <>
              <GitHubOAuthStep
                isConnected={!!githubUsername}
                githubUsername={githubUsername}
                githubName={githubName}
              />
              <QuestionnaireStep
                githubUsername={githubUsername}
                githubName={githubName}
                onSubmit={handleQuestionnaireSubmit}
              />
            </>
          )}

          {currentStep === 3 && githubUsername && (
            <>
              <GitHubOAuthStep
                isConnected={!!githubUsername}
                githubUsername={githubUsername}
                githubName={githubName}
              />
              <ApiKeySuccess />
            </>
          )}

          {/* Show message if trying to access step 2/3 without prerequisites */}
          {(currentStep === 2 || currentStep === 3) && !githubUsername && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="text-center text-gray-600">
                <p>Please complete the previous steps first.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-900 mb-2">Documentation</p>
              <p>Check out our <a href="/docs?section=api-reference" className="text-blue-600 hover:text-blue-700 underline">API documentation</a> for detailed guides and examples.</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-2">Support</p>
              <p>Join our <a href="https://github.com/openlabelsinitiative/OLI" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">GitHub repository</a> for community support.</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {newApiKey && (
        <ApiKeyModal
          isOpen={showApiKeyModal}
          apiKey={newApiKey.apiKey}
          keyId={newApiKey.keyId}
          onClose={() => {
            setShowApiKeyModal(false);
            // Clear the new API key after a delay to allow modal close animation
            setTimeout(() => {
              setNewApiKey(null);
            }, 300);
          }}
        />
      )}
    </div>
  );
};

/**
 * Main Developer Page Component with Suspense wrapper for useSearchParams
 */
const DeveloperPage = () => {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DeveloperPageContent />
    </Suspense>
  );
};

export default DeveloperPage;
