import React from 'react'
import { Button } from './Button'
import Link from 'next/link'
import { 
  DocumentTextIcon, 
  ChartBarIcon, 
  UserCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface EmptyStateProps {
  variant?: 'no-samples' | 'no-analysis' | 'no-profile' | 'error' | 'loading-failed'
  title: string
  description: string
  actionText?: string
  actionHref?: string
  onAction?: () => void
  className?: string
}

const variantConfig = {
  'no-samples': {
    icon: DocumentTextIcon,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50'
  },
  'no-analysis': {
    icon: ChartBarIcon,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50'
  },
  'no-profile': {
    icon: UserCircleIcon,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50'
  },
  'error': {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50'
  },
  'loading-failed': {
    icon: InformationCircleIcon,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-50'
  }
}

export function EmptyState({ 
  variant = 'no-samples',
  title, 
  description, 
  actionText, 
  actionHref, 
  onAction,
  className = '' 
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className={`mx-auto h-16 w-16 ${config.iconBg} rounded-full flex items-center justify-center mb-4`}>
        <Icon className={`h-8 w-8 ${config.iconColor}`} />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">{description}</p>
      
      {(actionText && (actionHref || onAction)) && (
        <div className="flex justify-center">
          {actionHref ? (
            <Link href={actionHref}>
              <Button className="bg-gray-900 text-white hover:bg-gray-800">
                {actionText}
              </Button>
            </Link>
          ) : (
            <Button 
              onClick={onAction}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              {actionText}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Predefined empty states for common scenarios
export const EmptyStates = {
  NoSamples: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      variant="no-samples"
      title="No writing samples yet"
      description="Add your first writing sample to start building your voice profile and get personalized analysis."
      actionText="Analyze your writing"
      actionHref="/analyze"
      {...props}
    />
  ),
  
  NoAnalysis: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      variant="no-analysis"
      title="No analyses available"
      description="Upload or paste your writing to get detailed authenticity analysis and personalized suggestions."
      actionText="Start analyzing"
      actionHref="/analyze"
      {...props}
    />
  ),
  
  NoProfile: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      variant="no-profile"
      title="Create your voice profile"
      description="Build a fingerprint of your authentic writing style to get personalized suggestions and preserve your voice."
      actionText="Create profile"
      actionHref="/onboarding/voiceprint"
      {...props}
    />
  ),
  
  LoadingFailed: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      variant="loading-failed"
      title="Unable to load data"
      description="We're having trouble loading your data. Please check your connection and try again."
      actionText="Retry"
      {...props}
    />
  ),
  
  AnalysisError: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      variant="error"
      title="Analysis failed"
      description="We couldn't process your text right now. Please try again or contact support if the problem persists."
      actionText="Try again"
      {...props}
    />
  )
}