import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_FILE_TYPES = ['.txt', '.pdf', '.docx']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
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
    
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Extract text content based on file type
    let extractedText: string = ''
    
    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      
      switch (fileExtension) {
        case '.txt':
          extractedText = fileBuffer.toString('utf-8')
          break
          
        case '.pdf':
          try {
            const pdfParse = require('pdf-parse')
            const pdfData = await pdfParse(fileBuffer)
            extractedText = pdfData.text.trim()
          } catch (pdfError) {
            const error = pdfError as Error
            return NextResponse.json({
              error: `PDF processing failed: ${error.message}. Please try converting to TXT format or ensure the PDF is not password-protected.`
            }, { status: 400 })
          }
          break
          
        case '.docx':
          try {
            const mammoth = require('mammoth')
            const docxResult = await mammoth.extractRawText({ buffer: fileBuffer })
            extractedText = docxResult.value
          } catch (docxError) {
            console.error('DOCX parsing error:', docxError)
            return NextResponse.json({
              error: 'Failed to extract text from DOCX file'
            }, { status: 400 })
          }
          break
          
        default:
          return NextResponse.json({
            error: 'Unsupported file type'
          }, { status: 400 })
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

    // Calculate word count
    const wordCount = extractedText.trim().split(/\s+/).length

    return NextResponse.json({
      content: extractedText,
      wordCount,
      fileName: file.name
    })
    
  } catch (error) {
    console.error('Extract text error:', error)
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    )
  }
}