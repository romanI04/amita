'use client'

import React, { useState, useEffect } from 'react'
import { 
  ClockIcon, 
  ArrowPathIcon, 
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/Toast'

interface Version {
  id: string
  version_number: number
  title: string
  description: string
  content: string
  changes_applied: any[]
  risk_score: number
  authenticity_score: number
  created_at: string
  is_current: boolean
}

interface VersionsTimelineProps {
  sampleId: string
  currentContent?: string
  onRestore?: (version: Version) => void
}

export default function VersionsTimeline({ 
  sampleId, 
  currentContent,
  onRestore 
}: VersionsTimelineProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (sampleId) {
      loadVersions()
    }
  }, [sampleId])

  const loadVersions = async () => {
    try {
      const response = await fetch(`/api/versions/list?sample_id=${sampleId}`)
      if (!response.ok) throw new Error('Failed to load versions')
      
      const data = await response.json()
      setVersions(data.versions || [])
    } catch (error) {
      showToast('Failed to load versions', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (version: Version) => {
    setRestoringVersion(version.id)
    try {
      const response = await fetch('/api/versions/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version_id: version.id,
          sample_id: sampleId
        })
      })
      
      if (!response.ok) throw new Error('Failed to restore version')
      
      const data = await response.json()
      showToast(data.message || 'Version restored successfully', 'success')
      
      // Refresh versions list
      await loadVersions()
      
      // Notify parent component
      if (onRestore) {
        onRestore(version)
      }
    } catch (error) {
      showToast('Failed to restore version', 'error')
    } finally {
      setRestoringVersion(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8">
        <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No versions saved yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Versions will appear here after you save changes
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
        
        {/* Version items */}
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div key={version.id} className="relative flex items-start">
              {/* Timeline dot */}
              <div className={`
                absolute left-2.5 w-3 h-3 rounded-full border-2 border-white z-10
                ${version.is_current 
                  ? 'bg-green-500 ring-4 ring-green-100' 
                  : 'bg-gray-400'
                }
              `} />
              
              {/* Version card */}
              <div className={`
                ml-10 flex-1 p-4 rounded-lg border transition-all cursor-pointer
                ${version.is_current 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
                }
              `}
              onClick={() => setSelectedVersion(version)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        Version {version.version_number}
                      </span>
                      {version.is_current && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Current
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(version.created_at)}
                      </span>
                    </div>
                    
                    {version.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {version.description}
                      </p>
                    )}
                    
                    {version.changes_applied && version.changes_applied.length > 0 && (
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          {version.changes_applied.length} changes applied
                        </span>
                      </div>
                    )}
                    
                    {/* Scores */}
                    <div className="flex items-center gap-4 mt-2">
                      {version.risk_score !== null && (
                        <div className="flex items-center gap-1">
                          <ExclamationTriangleIcon className={`h-3.5 w-3.5 ${
                            version.risk_score < 30 ? 'text-green-500' :
                            version.risk_score < 60 ? 'text-yellow-500' :
                            'text-red-500'
                          }`} />
                          <span className="text-xs text-gray-600">
                            {Math.round(version.risk_score)}% AI Risk
                          </span>
                        </div>
                      )}
                      {version.authenticity_score !== null && (
                        <div className="flex items-center gap-1">
                          <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs text-gray-600">
                            {Math.round(version.authenticity_score)}% Authentic
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {!version.is_current && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestore(version)
                      }}
                      disabled={restoringVersion === version.id}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      {restoringVersion === version.id ? (
                        <>
                          <ArrowPathIcon className="h-3 w-3 animate-spin inline mr-1" />
                          Restoring...
                        </>
                      ) : (
                        'Restore'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Compare button */}
      {selectedVersion && !selectedVersion.is_current && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <button
            onClick={() => setShowCompare(!showCompare)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            {showCompare ? 'Hide' : 'Show'} Comparison with Current
          </button>
        </div>
      )}
      
      {/* Comparison view */}
      {showCompare && selectedVersion && currentContent && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Version {selectedVersion.version_number}
            </h4>
            <div className="p-3 bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {selectedVersion.content.substring(0, 500)}...
              </pre>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Current Version
            </h4>
            <div className="p-3 bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {currentContent.substring(0, 500)}...
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}