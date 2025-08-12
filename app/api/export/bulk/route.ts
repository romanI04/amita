import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'
import { validate, generateRequestId, formatValidationError, bulkExportSchema } from '@/lib/validation'


export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validate(body, bulkExportSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { analysis_ids, format = 'zip', include_versions = true } = validation.data!
    // Note: include_metadata and anonymize not in current schema, using defaults
    const include_metadata = false
    const anonymize = false

    const supabase = await createClient()
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch analyses and verify ownership
    const { data: analyses, error: analysesError } = await supabase
      .from('writing_samples')
      .select(`
        *,
        voice_analysis (
          id,
          overall_score,
          ai_detected_sections,
          improvement_suggestions,
          style_characteristics,
          created_at
        )
      `)
      .in('id', analysis_ids)
      .eq('user_id', session.user.id)

    if (analysesError) {
      throw new Error(`Failed to fetch analyses: ${analysesError.message}`)
    }

    if (!analyses || analyses.length === 0) {
      return NextResponse.json(
        { error: 'No accessible analyses found' },
        { status: 404 }
      )
    }

    // Fetch versions if requested
    let versions: any[] = []
    if (include_versions) {
      const { data: versionData } = await supabase
        .from('analysis_versions')
        .select('*')
        .in('analysis_id', analyses.map(a => a.id))
        .eq('user_id', session.user.id)
        .order('analysis_id, version')

      versions = versionData || []
    }

    // Group versions by analysis ID
    const versionsByAnalysis = versions.reduce((acc, version) => {
      if (!acc[version.analysis_id]) {
        acc[version.analysis_id] = []
      }
      acc[version.analysis_id].push(version)
      return acc
    }, {} as Record<string, any[]>)

    // Create ZIP file
    const zip = new JSZip()
    
    // Add metadata file
    if (include_metadata) {
      const metadata = {
        export_date: new Date().toISOString(),
        user_id: anonymize ? 'anonymized' : session.user.id,
        total_analyses: analyses.length,
        export_format: format,
        include_versions,
        analyses: analyses.map(analysis => ({
          id: analysis.id,
          title: analysis.title,
          created_at: analysis.created_at,
          updated_at: analysis.updated_at,
          word_count: analysis.content?.length || 0,
          ai_confidence_score: analysis.ai_confidence_score,
          authenticity_score: analysis.authenticity_score,
          versions_count: versionsByAnalysis[analysis.id]?.length || 1
        }))
      }
      
      zip.file('metadata.json', JSON.stringify(metadata, null, 2))
    }

    // Process each analysis
    for (const analysis of analyses) {
      const folderName = `${sanitizeFilename(analysis.title || 'Untitled')}_${analysis.id.substring(0, 8)}`
      const folder = zip.folder(folderName)
      
      if (!folder) continue

      // Add original analysis
      const analysisData = {
        id: analysis.id,
        title: analysis.title,
        content: analysis.content,
        created_at: analysis.created_at,
        updated_at: analysis.updated_at,
        ai_confidence_score: analysis.ai_confidence_score,
        authenticity_score: analysis.authenticity_score,
        voice_analysis: include_metadata ? analysis.voice_analysis : undefined
      }

      // Add in different formats based on request
      switch (format) {
        case 'json':
          folder.file('analysis.json', JSON.stringify(analysisData, null, 2))
          break
        case 'txt':
          folder.file('original.txt', analysis.content || '')
          break
        default:
          folder.file('analysis.json', JSON.stringify(analysisData, null, 2))
          folder.file('original.txt', analysis.content || '')
      }

      // Add versions if available and requested
      if (include_versions && versionsByAnalysis[analysis.id]) {
        const versionsFolder = folder.folder('versions')
        if (versionsFolder) {
          for (const version of versionsByAnalysis[analysis.id]) {
            const versionData = {
              version: version.version,
              title: version.title,
              original_text: version.original_text,
              revised_text: version.revised_text,
              changes_applied: version.changes_applied,
              improvement_summary: version.improvement_summary,
              change_log: version.change_log,
              ai_confidence_score: version.ai_confidence_score,
              authenticity_score: version.authenticity_score,
              created_at: version.created_at
            }

            versionsFolder.file(`v${version.version}.json`, JSON.stringify(versionData, null, 2))
            
            if (version.revised_text) {
              versionsFolder.file(`v${version.version}_revised.txt`, version.revised_text)
            }
          }
        }
      }

      // Add analysis report if metadata is included
      if (include_metadata && analysis.voice_analysis?.[0]) {
        const report = generateAnalysisReport(analysis, analysis.voice_analysis[0])
        folder.file('analysis_report.md', report)
      }
    }

    // Generate the ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // Set response headers for file download
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="amita-analyses-${new Date().toISOString().split('T')[0]}.zip"`,
      'Content-Length': zipBuffer.length.toString()
    })

    return new NextResponse(zipBuffer as any, { headers })

  } catch (error) {
    console.error('Bulk export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 50)
}

function generateAnalysisReport(analysis: any, voiceAnalysis: any): string {
  const report = `# Analysis Report: ${analysis.title || 'Untitled'}

## Summary
- **Created:** ${new Date(analysis.created_at).toLocaleDateString()}
- **Word Count:** ${analysis.content?.length || 0}
- **Authenticity Score:** ${Math.round(analysis.authenticity_score || 0)}%
- **AI Risk Score:** ${Math.round(analysis.ai_confidence_score || 0)}%

## Analysis Details
${voiceAnalysis.overall_score ? `
### Overall Scores
- **Authenticity:** ${Math.round(voiceAnalysis.overall_score.authenticity || 0)}%
- **AI Likelihood:** ${Math.round(voiceAnalysis.overall_score.ai_likelihood || 0)}%
- **Voice Consistency:** ${Math.round(voiceAnalysis.overall_score.voice_consistency || 0)}%
- **Overall Quality:** ${Math.round(voiceAnalysis.overall_score.overall_quality || 0)}%
` : ''}

${voiceAnalysis.improvement_suggestions && voiceAnalysis.improvement_suggestions.length > 0 ? `
### Improvement Suggestions
${voiceAnalysis.improvement_suggestions.map((suggestion: string, index: number) => `${index + 1}. ${suggestion}`).join('\n')}
` : ''}

${voiceAnalysis.ai_detected_sections && voiceAnalysis.ai_detected_sections.length > 0 ? `
### AI-Detected Sections
${voiceAnalysis.ai_detected_sections.map((section: any, index: number) => `
#### Section ${index + 1}
- **Confidence:** ${Math.round(section.confidence || 0)}%
- **Reason:** ${section.reason || 'Not specified'}
- **Position:** Characters ${section.start_index}-${section.end_index}
${section.suggested_revision ? `- **Suggested Revision:** ${section.suggested_revision}` : ''}
`).join('\n')}
` : ''}

---
*Report generated by amita.ai on ${new Date().toISOString()}*
`

  return report
}