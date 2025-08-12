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
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'

const ACCEPTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<any[]>([])

  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)
    setSuccess(null)

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 5MB.')
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload TXT, PDF, or DOCX files.')
      } else {
        setError('Failed to upload file. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      setUploadedFiles(acceptedFiles)
      setSuccess(`${acceptedFiles.length} file(s) ready for processing`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 5,
    multiple: true
  })

  const processFiles = async () => {
    if (!user || uploadedFiles.length === 0) return

    setUploading(true)
    setError(null)
    setAnalysisResults([])

    try {
      const results = []
      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('user_id', user.id)

        const response = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to process ${file.name}`)
        }

        const result = await response.json()
        results.push({
          fileName: file.name,
          wordCount: result.wordCount,
          analysis: result.analysis,
          id: result.id
        })
      }

      setAnalysisResults(results)
      setSuccess(`Successfully uploaded and analyzed ${uploadedFiles.length} file(s)!`)
      setUploadedFiles([])

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process files')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(files => files.filter((_, i) => i !== index))
    if (uploadedFiles.length === 1) {
      setSuccess(null)
    }
  }

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
            Upload your documents to save them as writing samples for later analysis
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Document Upload</CardTitle>
            <CardDescription>
              Drag and drop files or click to browse. Supports TXT, PDF, and DOCX files up to 5MB each.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-lg text-primary-600">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-lg text-gray-600 mb-2">
                    Drag and drop your files here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    TXT, PDF, DOCX • Max 5MB per file • Up to 5 files
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && analysisResults.length > 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-green-600 font-medium">{success}</p>
                </div>
                
                {/* Analysis Results */}
                <div className="space-y-4 mb-4">
                  {analysisResults.map((result, index) => (
                    <div key={index} className="bg-white border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{result.fileName}</h4>
                        <span className="text-sm text-gray-500">{result.wordCount} words</span>
                      </div>
                      
                      {result.analysis ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Authenticity Score:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900">
                                {Math.round(result.analysis.authenticity_score || 0)}%
                              </span>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                result.analysis.authenticity_score >= 70 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {result.analysis.authenticity_score >= 70 ? 'High' : 'Medium'}
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">AI Detection Risk:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900">
                                {Math.round(result.analysis.ai_confidence_score || 0)}%
                              </span>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                result.analysis.ai_confidence_score <= 30 
                                  ? 'bg-green-100 text-green-800'
                                  : result.analysis.ai_confidence_score <= 60
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {result.analysis.ai_confidence_score <= 30 ? 'Low' : 
                                 result.analysis.ai_confidence_score <= 60 ? 'Medium' : 'High'} Risk
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Analysis not available</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    size="sm"
                    className="bg-primary-600 text-white hover:bg-primary-700"
                  >
                    View in Dashboard
                  </Button>
                  <Button
                    onClick={() => router.push('/analyze')}
                    variant="outline"
                    size="sm"
                    className="border-primary-300 text-primary-700 hover:bg-primary-50"
                  >
                    Analyze More
                  </Button>
                </div>
              </div>
            )}

            {success && analysisResults.length === 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-green-600 font-medium">{success}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    size="sm"
                    className="bg-primary-600 text-white hover:bg-primary-700"
                  >
                    View in Dashboard
                  </Button>
                  <Button
                    onClick={() => router.push('/analyze')}
                    variant="outline"
                    size="sm"
                    className="border-primary-300 text-primary-700 hover:bg-primary-50"
                  >
                    Analyze Now
                  </Button>
                </div>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Files to Process:</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1].toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    onClick={processFiles}
                    disabled={uploading}
                    loading={uploading}
                    size="lg"
                  >
                    {uploading ? 'Processing...' : `Process ${uploadedFiles.length} File(s)`}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">1</span>
                  </div>
                  <p className="text-gray-600">Files are securely uploaded and text is extracted</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">2</span>
                  </div>
                  <p className="text-gray-600">Saved as writing samples in your dashboard</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">3</span>
                  </div>
                  <p className="text-gray-600">Analyze them individually when you're ready</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Supported formats:</span>
                  <span className="font-medium">TXT, PDF, DOCX</span>
                </div>
                <div className="flex justify-between">
                  <span>Maximum file size:</span>
                  <span className="font-medium">5MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Files per upload:</span>
                  <span className="font-medium">Up to 5</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing time:</span>
                  <span className="font-medium">Instant upload</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </AppLayout>
  )
}