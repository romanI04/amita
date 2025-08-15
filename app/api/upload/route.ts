import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { directInsert } from '@/lib/supabase/direct-api'
import { xaiClient } from '@/lib/xai/client'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { AnalysisResponse } from '@/types'
// PDF and DOCX imports moved to function level to avoid import-time issues

// Supported file types
const ALLOWED_FILE_TYPES = ['.txt', '.pdf', '.docx']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

interface UploadResult {
  id: string
  wordCount: number
  extractedText: string
  analysis?: any // Optional analysis result
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'Upload API is working' })
}

export async function POST(request: NextRequest) {
  console.log('=== Upload API POST called ===')
  
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RATE_LIMITS.upload)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many uploads', 
        details: 'Rate limit exceeded. Please wait before uploading another file.',
        retryAfter: rateLimitResult.retryAfter
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60)
        }
      }
    )
  }
  
  try {
    console.log('Step 1: Parse form data...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log('No file in form data')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    console.log('File info:', {
      name: file.name,
      size: file.size,
      type: file.type
    })
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Check file extension
    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
    console.log('File extension:', fileExtension)
    
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    
    // PDF and DOCX processing is now enabled

    console.log('Step 2: Authenticate user...')
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('Authentication error:', userError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get session for RLS operations
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      console.log('No session access token found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('Authentication successful for user:', user.id)
    const userId = user.id

    console.log('Step 3: Extract text content...')

    // Extract text content based on file type
    let extractedText: string = ''
    
    try {
      console.log('Converting file to buffer...')
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      console.log('Buffer created, size:', fileBuffer.length)
      
      console.log('Extracting text for file type:', fileExtension)
      switch (fileExtension) {
        case '.txt':
          extractedText = fileBuffer.toString('utf-8')
          console.log('Text extracted from TXT, length:', extractedText.length)
          break
          
        case '.pdf':
          console.log('Processing PDF file with pdf-parse...')
          try {
            // Use pdf-parse - battle-tested and reliable
            console.log('Loading pdf-parse...')
            const pdfParse = require('pdf-parse')
            console.log('pdf-parse loaded successfully, parsing buffer of size:', fileBuffer.length)
            
            // Extract text from PDF with proper options
            const pdfData = await pdfParse(fileBuffer, {
              // Disable debug mode to avoid test file references
              version: 'v2.0.0',
              // Don't try to load test data
              max: 0
            })
            extractedText = pdfData.text.trim()
            console.log('Text extracted from PDF, length:', extractedText.length)
            console.log('PDF pages processed:', pdfData.numpages)
            
          } catch (pdfError) {
            const error = pdfError as Error & { code?: string }
            console.error('PDF parsing error details:', {
              message: error.message,
              name: error.name
            })
            
            // Handle specific PDF errors
            if (error.message.includes('ENOENT') && error.message.includes('test/data')) {
              // This is the test file reference error - try alternative approach
              console.log('Attempting alternative PDF parsing...')
              try {
                // Try parsing without any options
                const pdfParse = require('pdf-parse')
                const pdfData = await pdfParse(fileBuffer, {})
                extractedText = pdfData.text.trim()
                console.log('Alternative PDF extraction successful, length:', extractedText.length)
              } catch (altError) {
                console.error('Alternative PDF parsing also failed:', altError)
                return NextResponse.json({
                  error: 'PDF processing failed. Please try converting to TXT format or ensure the PDF is not corrupted.'
                }, { status: 400 })
              }
            } else {
              // Return a user-friendly error for other cases
              return NextResponse.json({
                error: `PDF processing failed: ${error.message}. Please try converting to TXT format or ensure the PDF is not password-protected.`
              }, { status: 400 })
            }
          }
          break
          
        case '.docx':
          console.log('Processing DOCX file...')
          try {
            // Dynamic import to avoid module loading issues
            const mammoth = require('mammoth')
            const docxResult = await mammoth.extractRawText({ buffer: fileBuffer })
            extractedText = docxResult.value
            console.log('Text extracted from DOCX, length:', extractedText.length)
          } catch (docxError) {
            console.error('DOCX parsing error:', docxError)
            throw new Error('Failed to extract text from DOCX file')
          }
          break
          
        default:
          throw new Error('Unsupported file type')
      }
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError)
      return NextResponse.json(
        { error: `Failed to extract text from file: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Validate extracted content
    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'No text content found in file' },
        { status: 400 }
      )
    }

    // Validate text length for analysis
    if (extractedText.trim().length < 50) {
      return NextResponse.json(
        { error: 'File content must be at least 50 characters for analysis' },
        { status: 400 }
      )
    }

    // Calculate word count
    const wordCount = extractedText.trim().split(/\s+/).length

    // Prepare writing sample data
    const writingSampleData = {
      user_id: userId,
      title: file.name,
      content: extractedText.trim(),
      file_name: file.name,
      file_type: fileExtension.substring(1), // Remove the dot
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert into database using directInsert with access token for RLS
    const { data: insertResult, error: insertError } = await directInsert(
      'writing_samples',
      writingSampleData,
      { accessToken: session.access_token }
    )

    if (insertError) {
      console.error('Database insertion error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save writing sample' },
        { status: 500 }
      )
    }

    // Return the result
    if (!insertResult || insertResult.length === 0) {
      console.error('No data returned from database insert')
      return NextResponse.json(
        { error: 'Failed to save file - no data returned' },
        { status: 500 }
      )
    }

    const sampleId = insertResult[0].id

    // Automatically trigger analysis of the uploaded content
    console.log('Triggering automatic analysis...')
    try {
      // Perform analysis using xAI directly (same logic as analyze API)
      console.log('Starting xAI analysis...')
      const analysis = await xaiClient.analyze(extractedText.trim(), userId)
      console.log('xAI analysis completed successfully')

      // Save voice analysis results using direct API
      try {
        await directInsert('voice_analysis', {
          user_id: userId,
          sample_id: sampleId,
          style_characteristics: analysis.style_analysis,
          improvement_suggestions: analysis.improvement_suggestions,
          ai_detected_sections: analysis.detected_sections,
          overall_score: {
            authenticity: analysis.authenticity_score,
            ai_likelihood: analysis.ai_confidence_score,
            voice_consistency: 85, // Default value
            overall_quality: Math.round((analysis.authenticity_score + (100 - analysis.ai_confidence_score)) / 2)
          }
        }, { accessToken: session.access_token })
        
        console.log('Voice analysis saved successfully via direct API')
      } catch (analysisError) {
        console.error('Error saving voice analysis via direct API:', analysisError)
      }

      // Track progress metrics using direct API
      try {
        // Insert authenticity metric
        await directInsert('progress_tracking', {
          user_id: userId,
          metric_type: 'authenticity',
          value: analysis.authenticity_score,
          recorded_at: new Date().toISOString()
        }, { accessToken: session.access_token })

        // Insert AI detection risk metric  
        await directInsert('progress_tracking', {
          user_id: userId,
          metric_type: 'ai_detection_risk',
          value: analysis.ai_confidence_score,
          recorded_at: new Date().toISOString()
        }, { accessToken: session.access_token })
        
        console.log('Progress metrics tracked successfully via direct API')
      } catch (progressError) {
        console.error('Error tracking progress via direct API:', progressError)
      }

      // Prepare the complete response payload that matches AnalysisResponse interface
      const analysisResult: AnalysisResponse = {
        id: sampleId,
        ai_confidence_score: analysis.ai_confidence_score ?? 0,
        authenticity_score: analysis.authenticity_score ?? 85,
        voice_fingerprint: analysis.voice_fingerprint ?? {
          avg_sentence_length: 18,
          vocabulary_diversity: 0.7,
          tone_characteristics: {
            formal: 0.5,
            casual: 0.5,
            technical: 0.3,
            creative: 0.4
          },
          style_patterns: {
            passive_voice_usage: 0.2,
            complex_sentences: 0.3,
            punctuation_style: {
              periods: 0.7,
              commas: 0.8,
              semicolons: 0.1,
              exclamation: 0.05
            }
          },
          characteristic_words: []
        },
        detected_sections: analysis.detected_sections ?? [],
        improvement_suggestions: analysis.improvement_suggestions ?? [
          'Continue writing in your natural voice - your unique style is valuable',
          'Focus on personal experiences and genuine insights',
          'Vary your sentence structure to maintain authentic flow'
        ],
        style_analysis: analysis.style_analysis ?? {
          sentence_structure: {
            avg_length: 18,
            complexity_score: 60,
            variety_score: 75
          },
          vocabulary: {
            diversity_index: 70,
            sophistication_level: 65,
            unique_word_ratio: 0.8
          },
          tone_analysis: {
            formality: 50,
            emotion: 40,
            confidence: 70
          }
        },
        overall_score: {
          authenticity: analysis.authenticity_score ?? 85,
          ai_likelihood: analysis.ai_confidence_score ?? 0
        }
      }

      const result: UploadResult = {
        id: sampleId,
        wordCount,
        extractedText: extractedText.trim(),
        analysis: analysisResult
      }

      console.log('Upload and analysis successful')
      return NextResponse.json(result)

    } catch (analysisError) {
      console.error('Analysis error:', analysisError)
      // Still return success for upload even if analysis fails
      const result: UploadResult = {
        id: sampleId,
        wordCount,
        extractedText: extractedText.trim()
      }
      console.log('Upload successful but analysis failed')
      return NextResponse.json(result)
    }

  } catch (error) {
    console.error('Upload API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Always return JSON, never let it fall through to HTML error page
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Upload failed',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}