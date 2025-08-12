import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validate, generateRequestId, formatValidationError, exportAnalysisParamsSchema, exportAnalysisQuerySchema } from '@/lib/validation'

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()
  
  try {
    // Await params in Next.js 15
    const resolvedParams = await params
    
    // Validate URL parameters
    const paramsValidation = validate(resolvedParams, exportAnalysisParamsSchema, requestId)
    if (!paramsValidation.success) {
      return NextResponse.json(
        formatValidationError(paramsValidation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const queryParams = {
      format: searchParams.get('format'),
      include_versions: searchParams.get('include_versions'),
      include_metadata: searchParams.get('include_metadata')
    }
    
    // Validate query parameters
    const queryValidation = validate(queryParams, exportAnalysisQuerySchema, requestId)
    if (!queryValidation.success) {
      return NextResponse.json(
        formatValidationError(queryValidation.error!, requestId),
        { status: 400 }
      )
    }
    
    const analysisId = resolvedParams.id
    const format = queryParams.format || 'json'
    const includeVersions = queryParams.include_versions === 'true'
    const includeMetadata = queryParams.include_metadata === 'true'

    const supabase = await createClient()
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch analysis and verify ownership
    const { data: analysis, error: analysisError } = await supabase
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
      .eq('id', analysisId)
      .eq('user_id', session.user.id)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch versions if requested
    let versions: any[] = []
    if (includeVersions) {
      const { data: versionData } = await supabase
        .from('analysis_versions')
        .select('*')
        .eq('analysis_id', analysisId)
        .eq('user_id', session.user.id)
        .order('version')

      versions = versionData || []
    }

    // Prepare export data based on format
    switch (format.toLowerCase()) {
      case 'json':
        return exportAsJSON(analysis, versions, includeMetadata)
      
      case 'txt':
        return exportAsText(analysis, versions)
      
      case 'md':
      case 'markdown':
        return exportAsMarkdown(analysis, versions, includeMetadata)
      
      case 'csv':
        return exportAsCSV(analysis, versions)
      
      default:
        return NextResponse.json(
          { error: 'Unsupported export format. Supported: json, txt, md, csv' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}

function exportAsJSON(analysis: any, versions: any[], includeMetadata: boolean) {
  const exportData = {
    analysis: {
      id: analysis.id,
      title: analysis.title,
      content: analysis.content,
      created_at: analysis.created_at,
      updated_at: analysis.updated_at,
      ai_confidence_score: analysis.ai_confidence_score,
      authenticity_score: analysis.authenticity_score,
      ...(includeMetadata && {
        voice_analysis: analysis.voice_analysis,
        metadata: {
          word_count: analysis.content?.length || 0,
          export_date: new Date().toISOString(),
          versions_count: versions.length
        }
      })
    },
    ...(versions.length > 0 && { versions })
  }

  const filename = `${sanitizeFilename(analysis.title || 'analysis')}.json`
  
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

function exportAsText(analysis: any, versions: any[]) {
  let content = `${analysis.title || 'Untitled Analysis'}\n`
  content += `${'='.repeat(content.length - 1)}\n\n`
  content += `Created: ${new Date(analysis.created_at).toLocaleString()}\n`
  content += `Authenticity: ${Math.round(analysis.authenticity_score || 0)}%\n`
  content += `AI Risk: ${Math.round(analysis.ai_confidence_score || 0)}%\n\n`
  content += `ORIGINAL TEXT:\n${'-'.repeat(15)}\n`
  content += `${analysis.content || ''}\n\n`

  if (versions.length > 0) {
    content += `VERSIONS:\n${'-'.repeat(10)}\n`
    versions.forEach(version => {
      content += `\nVersion ${version.version} (${new Date(version.created_at).toLocaleString()}):\n`
      if (version.improvement_summary) {
        content += `Summary: ${version.improvement_summary}\n`
      }
      if (version.revised_text) {
        content += `Revised Text:\n${version.revised_text}\n`
      }
      content += `Changes Applied: ${version.changes_applied || 0}\n`
      content += `AI Risk: ${Math.round(version.ai_confidence_score || 0)}%\n`
      content += `Authenticity: ${Math.round(version.authenticity_score || 0)}%\n`
      content += '-'.repeat(40) + '\n'
    })
  }

  const filename = `${sanitizeFilename(analysis.title || 'analysis')}.txt`
  
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

function exportAsMarkdown(analysis: any, versions: any[], includeMetadata: boolean) {
  let content = `# ${analysis.title || 'Untitled Analysis'}\n\n`
  
  if (includeMetadata) {
    content += `## Metadata\n`
    content += `- **Created:** ${new Date(analysis.created_at).toLocaleString()}\n`
    content += `- **Word Count:** ${analysis.content?.length || 0}\n`
    content += `- **Authenticity Score:** ${Math.round(analysis.authenticity_score || 0)}%\n`
    content += `- **AI Risk Score:** ${Math.round(analysis.ai_confidence_score || 0)}%\n`
    content += `- **Versions:** ${versions.length + 1}\n\n`
  }

  content += `## Original Text\n\n`
  content += `${analysis.content || ''}\n\n`

  if (versions.length > 0) {
    content += `## Revision History\n\n`
    versions.forEach((version, index) => {
      content += `### Version ${version.version}\n`
      content += `**Date:** ${new Date(version.created_at).toLocaleString()}\n`
      if (version.improvement_summary) {
        content += `**Summary:** ${version.improvement_summary}\n`
      }
      content += `**Changes Applied:** ${version.changes_applied || 0}\n`
      content += `**AI Risk:** ${Math.round(version.ai_confidence_score || 0)}%\n`
      content += `**Authenticity:** ${Math.round(version.authenticity_score || 0)}%\n\n`
      
      if (version.revised_text) {
        content += `#### Revised Text\n`
        content += `${version.revised_text}\n\n`
      }
      
      if (version.change_log && Array.isArray(version.change_log) && version.change_log.length > 0) {
        content += `#### Changes Made\n`
        version.change_log.forEach((change: any, idx: number) => {
          content += `${idx + 1}. ${change.description || change}\n`
        })
        content += '\n'
      }
      
      content += '---\n\n'
    })
  }

  if (includeMetadata && analysis.voice_analysis?.[0]) {
    const va = analysis.voice_analysis[0]
    content += `## Analysis Details\n\n`
    
    if (va.overall_score) {
      content += `### Scores\n`
      content += `- **Authenticity:** ${Math.round(va.overall_score.authenticity || 0)}%\n`
      content += `- **AI Likelihood:** ${Math.round(va.overall_score.ai_likelihood || 0)}%\n`
      content += `- **Voice Consistency:** ${Math.round(va.overall_score.voice_consistency || 0)}%\n`
      content += `- **Overall Quality:** ${Math.round(va.overall_score.overall_quality || 0)}%\n\n`
    }
    
    if (va.improvement_suggestions && va.improvement_suggestions.length > 0) {
      content += `### Improvement Suggestions\n`
      va.improvement_suggestions.forEach((suggestion: string, idx: number) => {
        content += `${idx + 1}. ${suggestion}\n`
      })
      content += '\n'
    }
  }

  content += `---\n*Exported from amita.ai on ${new Date().toLocaleString()}*\n`

  const filename = `${sanitizeFilename(analysis.title || 'analysis')}.md`
  
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

function exportAsCSV(analysis: any, versions: any[]) {
  let csv = 'Type,Version,Date,Title,AI_Risk,Authenticity,Changes_Applied,Word_Count,Summary\n'
  
  // Add original analysis
  csv += `Original,1,"${analysis.created_at}","${escapeCSV(analysis.title || 'Untitled')}",${analysis.ai_confidence_score || 0},${analysis.authenticity_score || 0},0,${analysis.content?.length || 0},"Original analysis"\n`
  
  // Add versions
  versions.forEach(version => {
    csv += `Version,${version.version},"${version.created_at}","${escapeCSV(version.title || analysis.title || 'Untitled')}",${version.ai_confidence_score || 0},${version.authenticity_score || 0},${version.changes_applied || 0},${version.revised_text?.length || 0},"${escapeCSV(version.improvement_summary || '')}"\n`
  })

  const filename = `${sanitizeFilename(analysis.title || 'analysis')}.csv`
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 50)
}

function escapeCSV(str: string): string {
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return str.replace(/"/g, '""')
  }
  return str
}