import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRequestId } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const body = await request.json()
    const { 
      export_type = 'analysis', // 'analysis', 'profile', 'all'
      analysis_ids = [],
      format = 'zip',
      include_versions = true,
      include_metadata = true,
      compress = true
    } = body

    const supabase = await createClient()
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required', request_id: requestId },
        { status: 401 }
      )
    }

    // Create a readable stream for the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ 
              type: 'progress', 
              message: 'Starting export...', 
              progress: 0 
            })}\n\n`
          ))

          let progress = 0
          const incrementProgress = (amount: number, message: string) => {
            progress = Math.min(progress + amount, 100)
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ 
                type: 'progress', 
                message, 
                progress 
              })}\n\n`
            ))
          }

          // Fetch user data based on export type
          let exportData: any = {
            export_date: new Date().toISOString(),
            user_id: session.user.id,
            request_id: requestId
          }

          if (export_type === 'analysis' || export_type === 'all') {
            incrementProgress(10, 'Fetching analyses...')
            
            // Build query
            let query = supabase
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
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })

            // Filter by specific IDs if provided
            if (analysis_ids.length > 0) {
              query = query.in('id', analysis_ids)
            }

            const { data: analyses, error: analysesError } = await query

            if (analysesError) throw analysesError
            
            exportData.analyses = analyses || []
            incrementProgress(20, `Found ${exportData.analyses.length} analyses`)

            // Fetch versions if requested
            if (include_versions && exportData.analyses.length > 0) {
              incrementProgress(5, 'Fetching version history...')
              
              const analysisIds = exportData.analyses.map((a: any) => a.id)
              const { data: versions } = await supabase
                .from('analysis_versions')
                .select('*')
                .in('analysis_id', analysisIds)
                .eq('user_id', session.user.id)
                .order('version')

              // Group versions by analysis
              const versionsByAnalysis: any = {}
              versions?.forEach(v => {
                if (!versionsByAnalysis[v.analysis_id]) {
                  versionsByAnalysis[v.analysis_id] = []
                }
                versionsByAnalysis[v.analysis_id].push(v)
              })

              // Attach versions to analyses
              exportData.analyses.forEach((analysis: any) => {
                analysis.versions = versionsByAnalysis[analysis.id] || []
              })

              incrementProgress(15, `Added ${versions?.length || 0} versions`)
            }
          }

          if (export_type === 'profile' || export_type === 'all') {
            incrementProgress(10, 'Fetching voice profile...')
            
            // Fetch voice profile
            const { data: voiceprint } = await supabase
              .from('voiceprints')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('is_active', true)
              .single()

            if (voiceprint) {
              exportData.voice_profile = voiceprint
              
              // Fetch voice traits
              const { data: traits } = await supabase
                .from('voiceprint_traits')
                .select('*')
                .eq('voiceprint_id', voiceprint.id)
                .single()
              
              if (traits) {
                exportData.voice_profile.traits = traits
              }
              
              incrementProgress(10, 'Voice profile included')
            }
          }

          if (export_type === 'all') {
            incrementProgress(5, 'Fetching user settings...')
            
            // Fetch user profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profile) {
              // Remove sensitive data
              delete profile.stripe_customer_id
              delete profile.stripe_subscription_id
              exportData.profile = profile
            }
            
            incrementProgress(5, 'Settings included')
          }

          // Calculate statistics
          if (exportData.analyses) {
            incrementProgress(5, 'Calculating statistics...')
            
            exportData.statistics = {
              total_analyses: exportData.analyses.length,
              total_words: exportData.analyses.reduce((sum: number, a: any) => 
                sum + (a.content?.length || 0), 0
              ),
              average_authenticity: exportData.analyses.length > 0
                ? exportData.analyses.reduce((sum: number, a: any) => 
                    sum + (a.authenticity_score || 0), 0
                  ) / exportData.analyses.length
                : 0,
              average_ai_risk: exportData.analyses.length > 0
                ? exportData.analyses.reduce((sum: number, a: any) => 
                    sum + (a.ai_confidence_score || 0), 0
                  ) / exportData.analyses.length
                : 0,
              total_versions: exportData.analyses.reduce((sum: number, a: any) => 
                sum + (a.versions?.length || 0), 0
              ),
              export_size_estimate: JSON.stringify(exportData).length
            }
            
            incrementProgress(5, 'Statistics calculated')
          }

          // Format the export based on requested format
          incrementProgress(10, `Formatting as ${format}...`)
          
          let finalData: string
          let mimeType: string
          let filename: string

          switch (format) {
            case 'json':
              finalData = JSON.stringify(exportData, null, 2)
              mimeType = 'application/json'
              filename = `amita-export-${Date.now()}.json`
              break
              
            case 'zip':
              // For ZIP, we'll return the data and let the client handle compression
              // In a real implementation, you'd use a library like JSZip or archiver
              finalData = JSON.stringify({
                files: [
                  {
                    name: 'export.json',
                    content: JSON.stringify(exportData, null, 2)
                  },
                  {
                    name: 'README.txt',
                    content: generateReadme(exportData)
                  }
                ]
              })
              mimeType = 'application/json' // Client will handle ZIP creation
              filename = `amita-export-${Date.now()}.zip`
              break
              
            default:
              finalData = JSON.stringify(exportData, null, 2)
              mimeType = 'application/json'
              filename = `amita-export-${Date.now()}.json`
          }

          incrementProgress(10, 'Export prepared')

          // Send the final data
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ 
              type: 'complete',
              message: 'Export complete',
              progress: 100,
              data: finalData,
              filename,
              mimeType,
              size: finalData.length
            })}\n\n`
          ))

          // Close the stream
          controller.close()
          
        } catch (error) {
          // Send error message
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ 
              type: 'error',
              message: error instanceof Error ? error.message : 'Export failed',
              request_id: requestId
            })}\n\n`
          ))
          controller.close()
        }
      }
    })

    // Return the stream with proper headers for SSE
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-Id': requestId
      }
    })

  } catch (error) {
    console.error('Export stream error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Export failed',
        request_id: requestId
      },
      { status: 500 }
    )
  }
}

function generateReadme(exportData: any): string {
  let readme = `AMITA.AI DATA EXPORT
====================

Export Date: ${exportData.export_date}
User ID: ${exportData.user_id}

CONTENTS:
---------
`

  if (exportData.analyses) {
    readme += `• ${exportData.analyses.length} Analyses\n`
    if (exportData.statistics?.total_versions) {
      readme += `• ${exportData.statistics.total_versions} Versions\n`
    }
  }

  if (exportData.voice_profile) {
    readme += `• Voice Profile (Active)\n`
  }

  if (exportData.profile) {
    readme += `• User Settings\n`
  }

  if (exportData.statistics) {
    readme += `
STATISTICS:
-----------
Total Words Analyzed: ${exportData.statistics.total_words?.toLocaleString() || 0}
Average Authenticity: ${Math.round(exportData.statistics.average_authenticity || 0)}%
Average AI Risk: ${Math.round(exportData.statistics.average_ai_risk || 0)}%
Total Versions: ${exportData.statistics.total_versions || 0}
`
  }

  readme += `

DATA PRIVACY:
-------------
This export contains your personal data from amita.ai.
Please store it securely and do not share with unauthorized parties.
Your data has been exported in accordance with your privacy settings.

For questions or support, contact: support@amita.ai

© ${new Date().getFullYear()} amita.ai - All rights reserved.
`

  return readme
}