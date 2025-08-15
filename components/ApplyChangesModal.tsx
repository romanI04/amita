'use client'

import React, { useState, useMemo } from 'react'
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'

interface Section {
  id: number
  original: string
  rewritten: string
  reason: string
  startIndex: number
  endIndex: number
  riskDelta?: number
}

interface ApplyChangesModalProps {
  isOpen: boolean
  onClose: () => void
  sections: Section[]
  onApply: (selectedSections: number[]) => Promise<void>
  voiceProfileEnabled?: boolean
}

export function ApplyChangesModal({ 
  isOpen, 
  onClose, 
  sections, 
  onApply,
  voiceProfileEnabled = false
}: ApplyChangesModalProps) {
  const [selectedSections, setSelectedSections] = useState<number[]>(
    sections.map(s => s.id)
  )
  const [isApplying, setIsApplying] = useState(false)
  const [appliedSections, setAppliedSections] = useState<number[]>([])
  const [failedSections, setFailedSections] = useState<number[]>([])
  const [currentStep, setCurrentStep] = useState<'review' | 'applying' | 'complete'>('review')

  const toggleSection = (id: number) => {
    setSelectedSections(prev =>
      prev.includes(id) 
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedSections(sections.map(s => s.id))
  }

  const deselectAll = () => {
    setSelectedSections([])
  }

  const handleApply = async () => {
    setCurrentStep('applying')
    setIsApplying(true)
    
    try {
      // Apply all changes immediately - no simulated delays
      await onApply(selectedSections)
      setAppliedSections(selectedSections)
      setCurrentStep('complete')
      
      // Close quickly after success
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Failed to apply changes:', error)
      setFailedSections(selectedSections.filter(id => !appliedSections.includes(id)))
    } finally {
      setIsApplying(false)
    }
  }

  const selectedCount = selectedSections.length
  const totalRiskReduction = useMemo(() => {
    return selectedSections.reduce((sum, id) => {
      const section = sections.find(s => s.id === id)
      return sum + (section?.riskDelta || 5)
    }, 0)
  }, [selectedSections, sections])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentStep === 'review' && 'Review Changes'}
                {currentStep === 'applying' && 'Applying Changes...'}
                {currentStep === 'complete' && 'Changes Applied!'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentStep === 'review' && `${selectedCount} of ${sections.length} sections selected`}
                {currentStep === 'applying' && `Processing ${appliedSections.length} of ${selectedCount} sections`}
                {currentStep === 'complete' && `Successfully applied ${appliedSections.length} changes`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isApplying}
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {currentStep === 'review' && (
              <>
                {/* Selection controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAll}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Expected risk reduction: <span className="font-semibold text-green-600">-{totalRiskReduction}%</span>
                  </div>
                </div>

                {/* Sections list */}
                <div className="space-y-4">
                  {sections.map(section => (
                    <div
                      key={section.id}
                      className={`border rounded-lg p-4 transition-all ${
                        selectedSections.includes(section.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section.id)}
                          onChange={() => toggleSection(section.id)}
                          className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium px-2 py-1 bg-orange-100 text-orange-700 rounded">
                              {section.reason}
                            </span>
                            {section.riskDelta && (
                              <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded">
                                -{ section.riskDelta}% risk
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Original</p>
                              <div className="p-2 bg-red-50 rounded border border-red-200 text-sm">
                                {section.original}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                Improved {voiceProfileEnabled && '(Voice-aware)'}
                              </p>
                              <div className="p-2 bg-green-50 rounded border border-green-200 text-sm">
                                {section.rewritten}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {currentStep === 'applying' && (
              <div className="space-y-3">
                {sections
                  .filter(s => selectedSections.includes(s.id))
                  .map(section => (
                    <div key={section.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {appliedSections.includes(section.id) ? (
                        <CheckIcon className="h-5 w-5 text-green-600" />
                      ) : failedSections.includes(section.id) ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      ) : (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                      )}
                      <span className="text-sm text-gray-700">
                        Section {section.id + 1}: {section.reason}
                      </span>
                      {appliedSections.includes(section.id) && (
                        <span className="text-xs text-green-600 ml-auto">Applied</span>
                      )}
                      {failedSections.includes(section.id) && (
                        <span className="text-xs text-red-600 ml-auto">Failed</span>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Changes Successfully Applied!
                </h3>
                <p className="text-gray-600">
                  {appliedSections.length} sections have been improved.
                  {voiceProfileEnabled && ' Your voice profile was preserved.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {currentStep === 'review' && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {voiceProfileEnabled && (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-primary-500 rounded-full"></span>
                    Voice profile active
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isApplying}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={selectedCount === 0 || isApplying}
                  loading={isApplying}
                  className="min-w-[120px]"
                >
                  Apply {selectedCount} {selectedCount === 1 ? 'Change' : 'Changes'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}