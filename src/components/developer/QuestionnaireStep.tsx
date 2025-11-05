'use client';

import React, { useState } from 'react';
import { Github, FileText, Loader2 } from 'lucide-react';

interface QuestionnaireStepProps {
  githubUsername: string;
  githubName: string;
  onSubmit: (data: QuestionnaireData) => void;
}

export interface QuestionnaireData {
  githubUsername: string;
  githubName: string;
  telegramHandle: string;
  organization: string;
  useCase: string;
}

/**
 * Step 2: Developer Questionnaire
 * Collect additional information from the developer
 */
const QuestionnaireStep: React.FC<QuestionnaireStepProps> = ({
  githubUsername,
  githubName,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    telegramHandle: '',
    organization: '',
    useCase: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.telegramHandle.trim()) {
      newErrors.telegramHandle = 'Telegram handle is required';
    } else if (!formData.telegramHandle.startsWith('@')) {
      newErrors.telegramHandle = 'Telegram handle must start with @';
    }

    if (!formData.organization.trim()) {
      newErrors.organization = 'Organization is required';
    }

    if (!formData.useCase.trim()) {
      newErrors.useCase = 'Use case description is required';
    } else if (formData.useCase.trim().length < 20) {
      newErrors.useCase = 'Please provide at least 20 characters describing your use case';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      onSubmit({
        githubUsername,
        githubName,
        telegramHandle: formData.telegramHandle.trim(),
        organization: formData.organization.trim(),
        useCase: formData.useCase.trim(),
      });
    } catch (error) {
      console.error('Failed to submit questionnaire:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-blue-100 p-3 rounded-xl">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Step 2: Complete Your Profile
          </h3>
          <p className="text-sm text-gray-600">
            Help us understand how you&apos;ll be using the OLI API. This information helps us provide better support.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GitHub Profile (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Profile <span className="text-gray-400">(from OAuth)</span>
          </label>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <Github className="w-5 h-5 text-gray-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{githubName || githubUsername}</p>
              <p className="text-xs text-gray-500">@{githubUsername}</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Locked</span>
          </div>
        </div>

        {/* Telegram Handle */}
        <div>
          <label htmlFor="telegramHandle" className="block text-sm font-medium text-gray-700 mb-2">
            Telegram Handle <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="telegramHandle"
            value={formData.telegramHandle}
            onChange={(e) => handleChange('telegramHandle', e.target.value)}
            placeholder="@your_telegram_handle"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder:text-gray-400 ${
              errors.telegramHandle ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          />
          {errors.telegramHandle && (
            <p className="mt-1 text-sm text-red-600">{errors.telegramHandle}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Your Telegram username (e.g., @username)
          </p>
        </div>

        {/* Organization */}
        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
            Organization <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="organization"
            value={formData.organization}
            onChange={(e) => handleChange('organization', e.target.value)}
            placeholder="Your company or organization name"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder:text-gray-400 ${
              errors.organization ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          />
          {errors.organization && (
            <p className="mt-1 text-sm text-red-600">{errors.organization}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Company, organization, or project name
          </p>
        </div>

        {/* Use Case */}
        <div>
          <label htmlFor="useCase" className="block text-sm font-medium text-gray-700 mb-2">
            What are you planning to use this API for? <span className="text-red-500">*</span>
          </label>
          <textarea
            id="useCase"
            value={formData.useCase}
            onChange={(e) => handleChange('useCase', e.target.value)}
            placeholder="Describe your use case, project, or how you plan to integrate the OLI API..."
            rows={5}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-gray-900 placeholder:text-gray-400 ${
              errors.useCase ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          />
          {errors.useCase && (
            <p className="mt-1 text-sm text-red-600">{errors.useCase}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Minimum 20 characters. Be as specific as possible.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:via-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Submit & Request API Key
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default QuestionnaireStep;

