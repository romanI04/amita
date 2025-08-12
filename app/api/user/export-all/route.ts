import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'
import { validate, generateRequestId, formatValidationError, exportAllSchema } from '@/lib/validation'


export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validate(body, exportAllSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { 
      include_analyses = true, 
      include_voice_profile = true, 
      include_settings = true,
      format = 'zip' 
    } = validation.data!

    const supabase = await createClient()
    
    // Get user_id from authenticated session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const user_id = user.id
    
    // Get session for RLS operations
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Log the export request
    const { data: exportLog } = await supabase
      .from('user_export_log')
      .insert({
        user_id,
        export_type: 'data_export',
        export_format: format,
        status: 'processing',
        export_metadata: { include_analyses, include_voice_profile, include_settings }
      })
      .select()
      .single()

    const zip = new JSZip()
    let totalItems = 0
    
    // Add export metadata
    const exportMetadata = {
      export_date: new Date().toISOString(),
      user_id: user_id,
      export_id: exportLog?.id,
      includes: {
        analyses: include_analyses,
        voice_profile: include_voice_profile,
        settings: include_settings
      },
      generated_by: 'amita.ai data export system'
    }
    
    zip.file('export_info.json', JSON.stringify(exportMetadata, null, 2))

    // Export user analyses
    if (include_analyses) {
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
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      if (!analysesError && analyses && analyses.length > 0) {
        const analysesFolder = zip.folder('analyses')
        if (analysesFolder) {
          // Export each analysis
          for (const analysis of analyses) {
            const folderName = `${sanitizeFilename(analysis.title || 'Untitled')}_${analysis.id.substring(0, 8)}`
            const analysisFolder = analysesFolder.folder(folderName)
            
            if (analysisFolder) {
              // Main analysis file
              analysisFolder.file('analysis.json', JSON.stringify(analysis, null, 2))
              analysisFolder.file('content.txt', analysis.content || '')
              
              // Analysis report
              const report = generateAnalysisReport(analysis)
              analysisFolder.file('report.md', report)
              
              totalItems++
            }
          }

          // Fetch and export versions
          const { data: versions } = await supabase
            .from('analysis_versions')
            .select('*')
            .eq('user_id', user_id)
            .order('analysis_id, version')

          if (versions && versions.length > 0) {
            // Group versions by analysis
            const versionsByAnalysis = versions.reduce((acc, version) => {
              if (!acc[version.analysis_id]) {
                acc[version.analysis_id] = []
              }
              acc[version.analysis_id].push(version)
              return acc
            }, {} as Record<string, any[]>)

            // Add versions to their respective analysis folders
            for (const [analysisId, analysisVersions] of Object.entries(versionsByAnalysis)) {
              const analysis = analyses.find(a => a.id === analysisId)
              if (analysis) {
                const folderName = `${sanitizeFilename(analysis.title || 'Untitled')}_${analysis.id.substring(0, 8)}`
                const versionsFolder = analysesFolder.folder(`${folderName}/versions`)
                
                if (versionsFolder) {
                  for (const version of analysisVersions as any[]) {
                    versionsFolder.file(`v${version.version}.json`, JSON.stringify(version, null, 2))
                    if (version.revised_text) {
                      versionsFolder.file(`v${version.version}_revised.txt`, version.revised_text)
                    }
                  }
                }
              }
            }
          }

          // Create analyses summary
          const analysesSummary = {
            total_analyses: analyses.length,
            date_range: {
              earliest: analyses[analyses.length - 1]?.created_at,
              latest: analyses[0]?.created_at
            },
            word_count: analyses.reduce((sum, a) => sum + (a.content?.length || 0), 0),
            average_authenticity: analyses.reduce((sum, a) => sum + (a.authenticity_score || 0), 0) / analyses.length,
            average_ai_risk: analyses.reduce((sum, a) => sum + (a.ai_confidence_score || 0), 0) / analyses.length,
            total_versions: versions?.length || 0
          }
          
          analysesFolder.file('summary.json', JSON.stringify(analysesSummary, null, 2))
        }
      }
    }

    // Export voice profile
    if (include_voice_profile) {
      const { data: voiceprint } = await supabase
        .from('voiceprints')
        .select('*')
        .eq('user_id', user_id)
        .single()

      const { data: traits } = await supabase
        .from('voiceprint_traits')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (voiceprint || traits) {
        const voiceFolder = zip.folder('voice_profile')
        if (voiceFolder) {
          if (voiceprint) {
            voiceFolder.file('voiceprint.json', JSON.stringify(voiceprint, null, 2))
          }
          if (traits) {
            voiceFolder.file('traits.json', JSON.stringify(traits, null, 2))
          }

          // Create voice profile summary
          const voiceProfileSummary = {
            created_at: voiceprint?.created_at || traits?.created_at,
            last_updated: voiceprint?.updated_at || traits?.updated_at,
            coverage: voiceprint?.coverage || null,
            traits_count: traits?.trait_summary?.signature_traits?.length || 0,
            pitfalls_count: traits?.trait_summary?.pitfalls?.length || 0,
            export_note: 'This is your unique voice fingerprint data. Keep it secure.'
          }
          
          voiceFolder.file('summary.json', JSON.stringify(voiceProfileSummary, null, 2))
          totalItems++
        }
      }
    }

    // Export settings
    if (include_settings) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user_id)
        .single()

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single()

      if (settings || profile) {
        const settingsFolder = zip.folder('settings')
        if (settingsFolder) {
          if (settings) {
            // Remove sensitive fields before export
            const exportSettings = { ...settings }
            delete exportSettings.id
            delete exportSettings.user_id
            
            settingsFolder.file('preferences.json', JSON.stringify(exportSettings, null, 2))
          }
          
          if (profile) {
            // Remove sensitive profile fields
            const exportProfile = {
              full_name: profile.full_name,
              writing_level: profile.writing_level,
              ai_usage_frequency: profile.ai_usage_frequency,
              primary_goals: profile.primary_goals,
              created_at: profile.created_at,
              updated_at: profile.updated_at
            }
            
            settingsFolder.file('profile.json', JSON.stringify(exportProfile, null, 2))
          }
          
          totalItems++
        }
      }
    }

    // Get usage statistics
    const { data: storageUsage } = await supabase
      .rpc('get_user_storage_usage', { target_user_id: user_id })
      .single()

    if (storageUsage) {
      zip.file('usage_statistics.json', JSON.stringify({
        ...storageUsage,
        export_date: new Date().toISOString(),
        total_exported_items: totalItems
      }, null, 2))
    }

    // Generate the ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    
    // Update export log
    if (exportLog) {
      await supabase
        .from('user_export_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          file_size_bytes: zipBuffer.length,
          items_exported: totalItems
        })
        .eq('id', exportLog.id)
    }

    // Set response headers
    const filename = `amita-complete-export-${user_id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.zip`
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zipBuffer.length.toString(),
      'X-Export-Items': totalItems.toString()
    })

    return new NextResponse(zipBuffer as any, { headers })

  } catch (error) {
    console.error('Complete export error:', error)
    
    // Update export log with error
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const user_id = user?.id || 'unknown'
      await supabase
        .from('user_export_log')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('status', 'processing')
    } catch (logError) {
      console.error('Failed to update export log:', logError)
    }

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

function generateAnalysisReport(analysis: any): string {
  const voiceAnalysis = analysis.voice_analysis?.[0]
  
  return `# Analysis Report: ${analysis.title || 'Untitled'}

## Basic Information
- **Created:** ${new Date(analysis.created_at).toLocaleString()}
- **Last Updated:** ${new Date(analysis.updated_at).toLocaleString()}
- **Word Count:** ${analysis.content?.length || 0}
- **Analysis ID:** ${analysis.id}

## Scores
- **Authenticity Score:** ${Math.round(analysis.authenticity_score || 0)}%
- **AI Confidence Score:** ${Math.round(analysis.ai_confidence_score || 0)}%

${voiceAnalysis ? `
## Voice Analysis Details
- **Analysis Date:** ${new Date(voiceAnalysis.created_at).toLocaleString()}

### Overall Scores
${voiceAnalysis.overall_score ? `
- **Authenticity:** ${Math.round(voiceAnalysis.overall_score.authenticity || 0)}%
- **AI Likelihood:** ${Math.round(voiceAnalysis.overall_score.ai_likelihood || 0)}%
- **Voice Consistency:** ${Math.round(voiceAnalysis.overall_score.voice_consistency || 0)}%
- **Overall Quality:** ${Math.round(voiceAnalysis.overall_score.overall_quality || 0)}%
` : 'Overall scores not available'}

### Improvement Suggestions
${voiceAnalysis.improvement_suggestions && voiceAnalysis.improvement_suggestions.length > 0 
  ? voiceAnalysis.improvement_suggestions.map((suggestion: string, index: number) => 
      `${index + 1}. ${suggestion}`
    ).join('\n')
  : 'No improvement suggestions available'
}

### AI-Detected Sections
${voiceAnalysis.ai_detected_sections && voiceAnalysis.ai_detected_sections.length > 0
  ? voiceAnalysis.ai_detected_sections.map((section: any, index: number) => `
**Section ${index + 1}:**
- Confidence: ${Math.round(section.confidence || 0)}%
- Reason: ${section.reason || 'Not specified'}
- Position: Characters ${section.start_index}-${section.end_index}
${section.suggested_revision ? `- Suggested Revision: ${section.suggested_revision}` : ''}
  `).join('\n')
  : 'No AI-detected sections found'
}
` : ''}

## Original Content

${analysis.content || 'No content available'}

---

*This report was generated by amita.ai on ${new Date().toISOString()}*
*Export ID: Generated during complete data export*
`
}