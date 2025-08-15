'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

interface ExportProgress {
  type: 'progress' | 'complete' | 'error'
  message: string
  progress: number
  data?: string
  filename?: string
  mimeType?: string
  size?: number
  request_id?: string
}

interface UseStreamingExportOptions {
  onProgress?: (progress: number, message: string) => void
  onComplete?: (data: any) => void
  onError?: (error: string, requestId?: string) => void
}

export function useStreamingExport(options: UseStreamingExportOptions = {}) {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  const startExport = useCallback(async (params: {
    export_type?: 'analysis' | 'profile' | 'all'
    analysis_ids?: string[]
    format?: 'json' | 'zip'
    include_versions?: boolean
    include_metadata?: boolean
    compress?: boolean
  }) => {
    setIsExporting(true)
    setProgress(0)
    setMessage('Initializing export...')
    setError(null)

    try {
      const response = await fetch('/api/export/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        credentials: 'same-origin'
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream available')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete SSE messages
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || '' // Keep incomplete message in buffer

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            try {
              const data: ExportProgress = JSON.parse(message.slice(6))
              
              setProgress(data.progress)
              setMessage(data.message)
              
              if (options.onProgress) {
                options.onProgress(data.progress, data.message)
              }

              if (data.type === 'complete' && data.data) {
                // Handle the exported data
                if (data.mimeType === 'application/json' && data.filename?.endsWith('.zip')) {
                  // Special handling for ZIP format
                  const zipData = JSON.parse(data.data)
                  await createAndDownloadZip(zipData.files, data.filename)
                } else {
                  // Direct download for other formats
                  downloadFile(data.data, data.filename || 'export.json', data.mimeType || 'application/json')
                }
                
                showToast('Export completed successfully', 'success')
                
                if (options.onComplete) {
                  options.onComplete(data)
                }
              } else if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e)
            }
          }
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setError(errorMessage)
      showToast(errorMessage, 'error')
      
      if (options.onError) {
        options.onError(errorMessage)
      }
    } finally {
      setIsExporting(false)
    }
  }, [showToast, options])

  const cancelExport = useCallback(() => {
    // In a real implementation, you'd abort the fetch request
    setIsExporting(false)
    setProgress(0)
    setMessage('')
  }, [])

  return {
    startExport,
    cancelExport,
    isExporting,
    progress,
    message,
    error
  }
}

// Helper function to download a file
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

// Helper function to create and download a ZIP file
async function createAndDownloadZip(files: Array<{ name: string; content: string }>, filename: string) {
  // Check if JSZip is available (would need to be installed: npm install jszip)
  if (typeof window !== 'undefined' && (window as any).JSZip) {
    const JSZip = (window as any).JSZip
    const zip = new JSZip()
    
    // Add files to ZIP
    files.forEach(file => {
      zip.file(file.name, file.content)
    })
    
    // Generate ZIP and download
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } else {
    // Fallback: Download as JSON if JSZip is not available
    downloadFile(JSON.stringify(files, null, 2), filename.replace('.zip', '.json'), 'application/json')
  }
}