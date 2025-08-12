'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  DocumentTextIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

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

  const { user } = useAuth()
  const router = useRouter()

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

    try {
      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('user_id', user.id)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to process ${file.name}`)
        }
      }

      setSuccess('All files processed successfully!')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

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
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold font-heading text-neutral-900">
                amita.ai
              </Link>
              <nav className="flex space-x-6">
                <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
                  Dashboard
                </Link>
                <Link href="/analyze" className="text-neutral-600 hover:text-neutral-900">
                  Analyze
                </Link>
                <span className="text-primary-600 font-medium">Upload</span>
                <Link href="/profile" className="text-neutral-600 hover:text-neutral-900">
                  Profile
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Upload Documents
          </h1>
          <p className="text-neutral-600">
            Upload your documents for batch analysis and voice profiling
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
                  : 'border-neutral-300 hover:border-neutral-400'
              }`}
            >
              <input {...getInputProps()} />
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
              {isDragActive ? (
                <p className="text-lg text-primary-600">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-lg text-neutral-600 mb-2">
                    Drag and drop your files here, or click to browse
                  </p>
                  <p className="text-sm text-neutral-500">
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

            {success && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-neutral-900 mb-3">Files to Process:</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-neutral-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{file.name}</p>
                          <p className="text-xs text-neutral-500">
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
                  <p className="text-neutral-600">Files are securely uploaded and text is extracted</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">2</span>
                  </div>
                  <p className="text-neutral-600">AI analysis detects patterns and authenticity</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">3</span>
                  </div>
                  <p className="text-neutral-600">Results are added to your voice profile</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-neutral-600">
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
                  <span className="font-medium">1-2 minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}