'use client'

import React, { useState } from 'react'
import { useStreamingExport } from '@/lib/hooks/useStreamingExport'
import { Button } from '@/components/ui/Button'
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  UserCircleIcon,
  FolderOpenIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  selectedAnalyses?: string[]
  exportType?: 'analysis' | 'profile' | 'all'
}

export default function ExportModal({ 
  isOpen, 
  onClose, 
  selectedAnalyses = [],
  exportType = 'all' 
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'zip'>('zip')
  const [includeVersions, setIncludeVersions] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [exportScope, setExportScope] = useState(exportType)
  
  const {
    startExport,
    cancelExport,
    isExporting,
    progress,
    message,
    error
  } = useStreamingExport({
    onComplete: () => {
      setTimeout(() => {
        onClose()
      }, 2000)
    }
  })

  const handleExport = () => {
    startExport({
      export_type: exportScope,
      analysis_ids: selectedAnalyses,
      format: selectedFormat,
      include_versions: includeVersions,
      include_metadata: includeMetadata,
      compress: selectedFormat === 'zip'
    })
  }

  const exportOptions = [
    { 
      id: 'analysis', 
      label: 'Analyses', 
      description: 'Your writing analyses and versions',
      icon: DocumentTextIcon,
      disabled: false
    },
    { 
      id: 'profile', 
      label: 'Voice Profile', 
      description: 'Your voice fingerprint and traits',
      icon: UserCircleIcon,
      disabled: false
    },
    { 
      id: 'all', 
      label: 'Everything', 
      description: 'Complete data export',
      icon: FolderOpenIcon,
      disabled: false
    }
  ]

  const formatOptions = [
    { 
      id: 'zip', 
      label: 'ZIP Archive', 
      description: 'Compressed file with all data'
    },
    { 
      id: 'json', 
      label: 'JSON', 
      description: 'Structured data format'
    }
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={!isExporting ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Export Your Data</h2>
                <p className="text-gray-600 mt-1">Download your analyses, voice profile, and settings</p>
              </div>
              <button
                onClick={onClose}
                disabled={isExporting}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {!isExporting ? (
              <>
                {/* Export Scope */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">What to export</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {exportOptions.map(option => (
                      <button
                        key={option.id}
                        onClick={() => setExportScope(option.id as any)}
                        disabled={option.disabled}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          exportScope === option.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option.icon className={`h-6 w-6 mx-auto mb-2 ${
                          exportScope === option.id ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Export format</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {formatOptions.map(format => (
                      <button
                        key={format.id}
                        onClick={() => setSelectedFormat(format.id as any)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedFormat === format.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900">{format.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{format.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="mb-6 space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">Include version history</div>
                      <div className="text-sm text-gray-500">Export all saved versions of your analyses</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeVersions}
                      onChange={(e) => setIncludeVersions(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">Include metadata</div>
                      <div className="text-sm text-gray-500">Export analysis scores and statistics</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>
                </div>

                {/* Selected Items Info */}
                {selectedAnalyses.length > 0 && (
                  <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedAnalyses.length}</strong> specific {selectedAnalyses.length === 1 ? 'analysis' : 'analyses'} selected for export
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExport}
                    className="flex items-center space-x-2"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>Export Data</span>
                  </Button>
                </div>
              </>
            ) : (
              /* Progress View */
              <div className="py-8">
                <div className="text-center mb-6">
                  {progress < 100 ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Exporting your data...</h3>
                      <p className="text-sm text-gray-600">{message}</p>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Export complete!</h3>
                      <p className="text-sm text-gray-600">Your download should start automatically</p>
                    </>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2 mb-6">
                  {[
                    { step: 'Fetching analyses', min: 0, max: 30 },
                    { step: 'Loading versions', min: 30, max: 50 },
                    { step: 'Processing voice profile', min: 50, max: 70 },
                    { step: 'Formatting export', min: 70, max: 90 },
                    { step: 'Finalizing', min: 90, max: 100 }
                  ].map((step, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`h-2 w-2 rounded-full ${
                        progress > step.min ? 'bg-blue-600' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm ${
                        progress > step.min ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {step.step}
                      </span>
                      {progress >= step.min && progress < step.max && (
                        <div className="animate-pulse text-blue-600 text-xs">In progress...</div>
                      )}
                      {progress >= step.max && (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Cancel Button */}
                {progress < 100 && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        cancelExport()
                        onClose()
                      }}
                    >
                      Cancel Export
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}