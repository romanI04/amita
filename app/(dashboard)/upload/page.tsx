'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { 
  DocumentTextIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'
import { motion, AnimatePresence } from 'framer-motion'

const ACCEPTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

interface FileUploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  result?: any
  error?: string
}

export default function UploadPage() {
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  
  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        let errorMsg = 'Failed to add file'
        if (rejection.errors[0]?.code === 'file-too-large') {
          errorMsg = `${rejection.file.name}: File is too large (max 5MB)`
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          errorMsg = `${rejection.file.name}: Invalid file type`
        }
        showToast(errorMsg, 'error')
      })
    }

    // Add accepted files to status list
    if (acceptedFiles.length > 0) {
      const newStatuses = acceptedFiles.map(file => ({
        file,
        status: 'pending' as const,
        progress: 0
      }))
      
      setFileStatuses(prev => [...prev, ...newStatuses])
      showToast(`Added ${acceptedFiles.length} file(s) for processing`, 'success')
    }
  }, [showToast])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 10,
    multiple: true,
    disabled: isProcessing
  })

  const removeFile = (index: number) => {
    setFileStatuses(prev => prev.filter((_, i) => i !== index))
  }

  const processFiles = async () => {
    if (!user || fileStatuses.length === 0) return
    
    setIsProcessing(true)
    
    // Process files sequentially with individual progress
    for (let i = 0; i < fileStatuses.length; i++) {
      const fileStatus = fileStatuses[i]
      
      // Skip already processed files
      if (fileStatus.status === 'success') continue
      
      try {
        // Update status to uploading
        setFileStatuses(prev => prev.map((fs, idx) => 
          idx === i ? { ...fs, status: 'uploading', progress: 20 } : fs
        ))
        
        const formData = new FormData()
        formData.append('file', fileStatus.file)
        formData.append('user_id', user.id)
        
        // Upload file
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        })
        
        // Update progress
        setFileStatuses(prev => prev.map((fs, idx) => 
          idx === i ? { ...fs, progress: 50 } : fs
        ))
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Upload failed')
        }
        
        const uploadResult = await uploadResponse.json()
        
        // Update to processing
        setFileStatuses(prev => prev.map((fs, idx) => 
          idx === i ? { ...fs, status: 'processing', progress: 70 } : fs
        ))
        
        // If analysis is enabled, wait for it
        if (uploadResult.analysis_id) {
          // Simulate analysis progress
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          setFileStatuses(prev => prev.map((fs, idx) => 
            idx === i ? { ...fs, progress: 90 } : fs
          ))
        }
        
        // Mark as success
        setFileStatuses(prev => prev.map((fs, idx) => 
          idx === i ? { 
            ...fs, 
            status: 'success', 
            progress: 100,
            result: uploadResult
          } : fs
        ))
        
      } catch (error) {
        // Mark as error
        setFileStatuses(prev => prev.map((fs, idx) => 
          idx === i ? { 
            ...fs, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Processing failed'
          } : fs
        ))
      }
    }
    
    setIsProcessing(false)
    
    // Show summary
    const successCount = fileStatuses.filter(fs => fs.status === 'success').length
    const errorCount = fileStatuses.filter(fs => fs.status === 'error').length
    
    if (successCount > 0) {
      showToast(`Successfully processed ${successCount} file(s)`, 'success')
    }
    if (errorCount > 0) {
      showToast(`${errorCount} file(s) failed to process`, 'error')
    }
  }

  const retryFile = async (index: number) => {
    const fileStatus = fileStatuses[index]
    
    // Reset status
    setFileStatuses(prev => prev.map((fs, idx) => 
      idx === index ? { ...fs, status: 'pending', error: undefined, progress: 0 } : fs
    ))
    
    // Reprocess
    await processFiles()
  }

  const clearCompleted = () => {
    setFileStatuses(prev => prev.filter(fs => fs.status !== 'success'))
  }

  const getStatusColor = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700'
      case 'uploading': return 'bg-blue-100 text-blue-700'
      case 'processing': return 'bg-yellow-100 text-yellow-700'
      case 'success': return 'bg-green-100 text-green-700'
      case 'error': return 'bg-red-100 text-red-700'
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'PDF'
    if (ext === 'docx') return 'DOC'
    return 'TXT'
  }

  const totalFiles = fileStatuses.length
  const successFiles = fileStatuses.filter(fs => fs.status === 'success').length
  const errorFiles = fileStatuses.filter(fs => fs.status === 'error').length
  const pendingFiles = fileStatuses.filter(fs => fs.status === 'pending').length

  return (
    <AppLayout>
      <div className="flex-1 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Upload Documents
            </h1>
            <p className="text-neutral-600">
              Upload multiple documents for batch processing and analysis
            </p>
          </div>

          {/* Upload Area */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
              <CardDescription>
                Drag and drop files or click to browse. Supports TXT, PDF, and DOCX files up to 5MB each.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDrop={() => setDragActive(false)}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                  ${dragActive 
                    ? 'border-primary-400 bg-primary-50 scale-[1.02]' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }
                `}
              >
                <input {...getInputProps()} />
                <CloudArrowUpIcon className={`mx-auto h-12 w-12 mb-4 transition-colors ${
                  dragActive ? 'text-primary-500' : 'text-gray-400'
                }`} />
                
                {dragActive ? (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="text-lg text-primary-600 font-medium"
                  >
                    Drop your files here...
                  </motion.div>
                ) : (
                  <div>
                    <p className="text-lg text-gray-600 mb-2">
                      {isProcessing 
                        ? 'Processing files...' 
                        : 'Drag and drop your files here, or click to browse'
                      }
                    </p>
                    <p className="text-sm text-gray-500">
                      TXT, PDF, DOCX • Max 5MB per file • Up to 10 files
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File Status List */}
          {fileStatuses.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Files ({totalFiles})</CardTitle>
                    <CardDescription>
                      {successFiles > 0 && <span className="text-green-600">{successFiles} processed</span>}
                      {successFiles > 0 && pendingFiles > 0 && ', '}
                      {pendingFiles > 0 && <span className="text-gray-600">{pendingFiles} pending</span>}
                      {errorFiles > 0 && <span className="text-red-600">, {errorFiles} failed</span>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {successFiles > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearCompleted}
                      >
                        Clear Completed
                      </Button>
                    )}
                    <Button
                      onClick={processFiles}
                      disabled={isProcessing || pendingFiles === 0}
                      size="sm"
                      className="bg-primary-600 text-white hover:bg-primary-700"
                    >
                      {isProcessing ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          Process All
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence>
                  {fileStatuses.map((fileStatus, index) => (
                    <motion.div
                      key={`${fileStatus.file.name}-${index}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{getFileIcon(fileStatus.file.name)}</span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {fileStatus.file.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(fileStatus.file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(fileStatus.status)}`}>
                            {fileStatus.status === 'uploading' && 'Uploading...'}
                            {fileStatus.status === 'processing' && 'Analyzing...'}
                            {fileStatus.status === 'success' && 'Complete'}
                            {fileStatus.status === 'error' && 'Failed'}
                            {fileStatus.status === 'pending' && 'Pending'}
                          </span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {fileStatus.status === 'error' && (
                            <button
                              onClick={() => retryFile(index)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="Retry"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          )}
                          {fileStatus.status === 'success' && fileStatus.result?.id && (
                            <button
                              onClick={() => router.push(`/analyze?sample_id=${fileStatus.result.id}`)}
                              className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
                            >
                              View Analysis
                            </button>
                          )}
                          {(fileStatus.status === 'pending' || fileStatus.status === 'error') && (
                            <button
                              onClick={() => removeFile(index)}
                              className="p-1 text-gray-500 hover:text-red-600"
                              title="Remove"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {(fileStatus.status === 'uploading' || fileStatus.status === 'processing') && (
                        <div className="mt-3">
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-blue-500 to-primary-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${fileStatus.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {fileStatus.error && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-600">{fileStatus.error}</p>
                        </div>
                      )}
                      
                      {/* Success Details */}
                      {fileStatus.status === 'success' && fileStatus.result && (
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Words:</span>
                            <p className="font-medium">{fileStatus.result.wordCount || 0}</p>
                          </div>
                          {fileStatus.result.analysis && (
                            <>
                              <div>
                                <span className="text-gray-500">AI Risk:</span>
                                <p className={`font-medium ${
                                  fileStatus.result.analysis.ai_confidence_score < 30 ? 'text-green-600' :
                                  fileStatus.result.analysis.ai_confidence_score < 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {Math.round(fileStatus.result.analysis.ai_confidence_score)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Authenticity:</span>
                                <p className="font-medium text-green-600">
                                  {Math.round(fileStatus.result.analysis.authenticity_score)}%
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {fileStatuses.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No files uploaded yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Upload your documents to analyze them for AI content and get authenticity scores
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}