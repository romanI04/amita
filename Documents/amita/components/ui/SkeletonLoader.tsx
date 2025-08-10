import React from 'react'

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'profile' | 'analysis' | 'circular'
  lines?: number
  className?: string
}

export function SkeletonLoader({ variant = 'text', lines = 3, className = '' }: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'
  
  switch (variant) {
    case 'circular':
      return <div className={`${baseClasses} rounded-full w-12 h-12 ${className}`} />
    
    case 'card':
      return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-6 ${className}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      )
    
    case 'profile':
      return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-6 ${className}`}>
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 mb-4">
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="h-5 w-5 bg-gray-200 rounded"></div>
                    <div className="space-y-1 flex-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    
    case 'analysis':
      return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-6 ${className}`}>
          <div className="animate-pulse">
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                <div className="flex items-center space-x-4">
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="h-8 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    
    default: // text
      return (
        <div className={`animate-pulse space-y-2 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`h-4 bg-gray-200 rounded ${
                i === lines - 1 ? 'w-3/4' : 'w-full'
              }`}
            />
          ))}
        </div>
      )
  }
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <SkeletonLoader variant="analysis" className="mb-6" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
          </div>
        </div>
      </div>
    </div>
  )
}