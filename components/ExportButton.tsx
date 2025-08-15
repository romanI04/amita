'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowDownTrayIcon,
  DocumentTextIcon,
  DocumentIcon,
  ChevronDownIcon,
  CheckIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { useToast } from './ui/Toast'

interface ExportButtonProps {
  content: string
  filename?: string
  metadata?: {
    title?: string
    aiScore?: number
    authenticityScore?: number
    analyzedAt?: string
    improvements?: string[]
  }
}

type ExportFormat = 'txt' | 'docx' | 'copy' | 'email'

export function ExportButton({ content, filename = 'analysis', metadata }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const { showToast } = useToast()

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)

    try {
      switch (format) {
        case 'txt':
          exportAsTxt()
          break
        case 'docx':
          await exportAsDocx()
          break
        case 'copy':
          await copyToClipboard()
          break
        case 'email':
          exportAsEmail()
          break
      }
      
      showToast('Export successful!', 'success')
      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Export failed. Please try again.', 'error')
    } finally {
      setExporting(null)
    }
  }

  const exportAsTxt = () => {
    // Create content with metadata
    let fullContent = ''
    
    if (metadata?.title) {
      fullContent += `Title: ${metadata.title}\n`
    }
    if (metadata?.analyzedAt) {
      fullContent += `Analyzed: ${new Date(metadata.analyzedAt).toLocaleString()}\n`
    }
    if (metadata?.aiScore !== undefined) {
      fullContent += `AI Detection Risk: ${metadata.aiScore}%\n`
    }
    if (metadata?.authenticityScore !== undefined) {
      fullContent += `Authenticity Score: ${metadata.authenticityScore}%\n`
    }
    
    fullContent += '\n---\n\n'
    fullContent += content
    
    if (metadata?.improvements && metadata.improvements.length > 0) {
      fullContent += '\n\n---\nSuggested Improvements:\n'
      metadata.improvements.forEach((imp, i) => {
        fullContent += `${i + 1}. ${imp}\n`
      })
    }

    // Create blob and download
    const blob = new Blob([fullContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportAsDocx = async () => {
    // For DOCX, we'll create a simple HTML that Word can understand
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${metadata?.title || filename}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .metadata { color: #666; margin-bottom: 20px; }
          .content { white-space: pre-wrap; }
          .improvements { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; }
        </style>
      </head>
      <body>
    `
    
    if (metadata) {
      htmlContent += '<div class="metadata">'
      if (metadata.title) {
        htmlContent += `<h1>${metadata.title}</h1>`
      }
      htmlContent += '<p>'
      if (metadata.analyzedAt) {
        htmlContent += `Analyzed: ${new Date(metadata.analyzedAt).toLocaleString()}<br>`
      }
      if (metadata.aiScore !== undefined) {
        htmlContent += `AI Detection Risk: ${metadata.aiScore}%<br>`
      }
      if (metadata.authenticityScore !== undefined) {
        htmlContent += `Authenticity Score: ${metadata.authenticityScore}%`
      }
      htmlContent += '</p></div>'
    }
    
    htmlContent += `<div class="content">${content.replace(/\n/g, '<br>')}</div>`
    
    if (metadata?.improvements && metadata.improvements.length > 0) {
      htmlContent += '<div class="improvements"><h2>Suggested Improvements</h2><ol>'
      metadata.improvements.forEach(imp => {
        htmlContent += `<li>${imp}</li>`
      })
      htmlContent += '</ol></div>'
    }
    
    htmlContent += '</body></html>'

    // Create blob with Word-compatible HTML
    const blob = new Blob([htmlContent], { 
      type: 'application/vnd.ms-word' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content)
  }

  const exportAsEmail = () => {
    const subject = encodeURIComponent(metadata?.title || 'Writing Analysis Results')
    let body = content
    
    if (metadata?.improvements && metadata.improvements.length > 0) {
      body += '\n\nSuggested Improvements:\n'
      metadata.improvements.forEach((imp, i) => {
        body += `${i + 1}. ${imp}\n`
      })
    }
    
    const mailtoLink = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoLink
  }

  const exportOptions = [
    { 
      format: 'txt' as ExportFormat, 
      label: 'Text File', 
      icon: <DocumentTextIcon className="h-4 w-4" />,
      description: 'Plain text with metadata'
    },
    { 
      format: 'docx' as ExportFormat, 
      label: 'Word Doc', 
      icon: <DocumentIcon className="h-4 w-4" />,
      description: 'Microsoft Word compatible'
    },
    { 
      format: 'copy' as ExportFormat, 
      label: 'Copy Text', 
      icon: <ClipboardDocumentIcon className="h-4 w-4" />,
      description: 'Copy to clipboard'
    },
    { 
      format: 'email' as ExportFormat, 
      label: 'Email', 
      icon: <ArrowDownTrayIcon className="h-4 w-4" />,
      description: 'Send via email'
    }
  ]

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        Export
        <ChevronDownIcon className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-40 overflow-hidden"
            >
              <div className="p-2">
                {exportOptions.map((option) => (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option.format)}
                    disabled={exporting !== null}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-gray-500">
                          {option.icon}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {option.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {option.description}
                          </div>
                        </div>
                      </div>
                      {exporting === option.format && (
                        <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}