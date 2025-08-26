'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useVoiceProfile } from '@/lib/context/VoiceProfileContext'
import { Button } from '@/components/ui/Button'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyStates } from '@/components/ui/EmptyState'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useToast } from '@/components/ui/Toast'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import type { WritingSample } from '@/types'

interface HistoryFilters {
  search: string
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year'
  aiRiskLevel: 'all' | 'low' | 'medium' | 'high'
  authenticityLevel: 'all' | 'low' | 'medium' | 'high'
  sortBy: 'date' | 'title' | 'ai_risk' | 'authenticity'
  sortOrder: 'asc' | 'desc'
}

interface AnalysisVersion {
  id: string
  version: number
  title: string
  original_text: string
  revised_text?: string
  changes_applied: number
  created_at: string
  ai_confidence_score: number
  authenticity_score: number
}

interface HistoryItem extends WritingSample {
  versions?: AnalysisVersion[]
  latest_version?: number
  total_changes?: number
  improvement_percentage?: number
}

const INITIAL_FILTERS: HistoryFilters = {
  search: '',
  dateRange: 'all',
  aiRiskLevel: 'all',
  authenticityLevel: 'all',
  sortBy: 'date',
  sortOrder: 'desc'
}

export default function HistoryPage() {
  const { user, loading } = useAuth()
  const { state: voiceProfileState } = useVoiceProfile()
  const { showToast } = useToast()
  
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 10,
    total: 0,
    hasMore: false
  })
  const [filters, setFilters] = useState<HistoryFilters>(INITIAL_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonItems, setComparisonItems] = useState<string[]>([])

  // Load user's analysis history
  useEffect(() => {
    if (!user) return

    const loadHistory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/user/history?user_id=${user.id}&offset=0&limit=10`, {
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load history')
        }

        const data = await response.json()
        setHistoryItems(data.analyses || [])
        
        // Set pagination info
        if (data.pagination) {
          setPagination({
            offset: data.pagination.offset || 0,
            limit: data.pagination.limit || 10,
            total: data.pagination.total || 0,
            hasMore: data.pagination.has_more || false
          })
        }
      } catch (err) {
        console.error('History loading error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analysis history')
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [user])

  // Load more handler
  const handleLoadMore = async () => {
    if (!user || isLoadingMore || !pagination.hasMore) return
    
    setIsLoadingMore(true)
    const newOffset = pagination.offset + pagination.limit
    
    try {
      const response = await fetch(`/api/user/history?user_id=${user.id}&offset=${newOffset}&limit=10`, {
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load more history')
      }

      const data = await response.json()
      setHistoryItems(prev => [...prev, ...(data.analyses || [])])
      
      // Update pagination info
      if (data.pagination) {
        setPagination({
          offset: data.pagination.offset || newOffset,
          limit: data.pagination.limit || 10,
          total: data.pagination.total || pagination.total,
          hasMore: data.pagination.has_more || false
        })
      }
    } catch (err) {
      console.error('Load more error:', err)
      setError('Failed to load more items')
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Filter and sort history items
  const filteredItems = useMemo(() => {
    let items = [...historyItems]

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim()
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.content.toLowerCase().includes(searchTerm)
      )
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      items = items.filter(item => new Date(item.created_at) >= filterDate)
    }

    // Apply AI risk level filter
    if (filters.aiRiskLevel !== 'all') {
      items = items.filter(item => {
        const risk = item.ai_confidence_score || 0
        switch (filters.aiRiskLevel) {
          case 'low': return risk <= 20
          case 'medium': return risk > 20 && risk <= 60
          case 'high': return risk > 60
          default: return true
        }
      })
    }

    // Apply authenticity level filter
    if (filters.authenticityLevel !== 'all') {
      items = items.filter(item => {
        const auth = item.authenticity_score || 0
        switch (filters.authenticityLevel) {
          case 'low': return auth < 60
          case 'medium': return auth >= 60 && auth < 85
          case 'high': return auth >= 85
          default: return true
        }
      })
    }

    // Apply sorting
    items.sort((a, b) => {
      let aVal, bVal
      
      switch (filters.sortBy) {
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'ai_risk':
          aVal = a.ai_confidence_score || 0
          bVal = b.ai_confidence_score || 0
          break
        case 'authenticity':
          aVal = a.authenticity_score || 0
          bVal = b.authenticity_score || 0
          break
        case 'date':
        default:
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return items
  }, [historyItems, filters])

  const handleFilterChange = (key: keyof HistoryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleBulkExport = async () => {
    if (selectedItems.length === 0) return

    try {
      const response = await fetch('/api/export/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysis_ids: selectedItems,
          format: 'zip',
          include_versions: true
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `amita-analyses-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      showToast('Failed to export analyses. Please try again.', 'error')
    }
  }

  const handleCompareItems = () => {
    if (selectedItems.length < 2) {
      showToast('Please select at least 2 analyses to compare', 'warning')
      return
    }
    
    setComparisonItems(selectedItems.slice(0, 3)) // Limit to 3 for UI clarity
    setShowComparison(true)
  }

  const getRiskColor = (risk: number) => {
    if (risk <= 20) return 'text-green-700 bg-green-50'
    if (risk <= 60) return 'text-amber-700 bg-amber-50'
    return 'text-red-700 bg-red-50'
  }

  const getAuthenticityColor = (auth: number) => {
    if (auth >= 85) return 'text-green-700'
    if (auth >= 60) return 'text-amber-700'
    return 'text-red-700'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  if (loading || isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 bg-gray-50">
          <div className="max-w-7xl mx-auto py-8 px-6">
            <SkeletonLoader variant="card" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex-1 bg-gray-50">
          <div className="max-w-4xl mx-auto py-12 px-6">
            <EmptyStates.LoadingFailed 
              title="Failed to load history"
              description={error}
              onAction={() => window.location.reload()}
            />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="flex-1 bg-gray-50">
          <div className="max-w-7xl mx-auto py-8 px-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    Analysis History
                  </h1>
                  <p className="text-gray-600">
                    Review your past analyses, track improvements, and compare versions
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  {selectedItems.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleBulkExport}
                        className="flex items-center space-x-2"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>Export ({selectedItems.length})</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={handleCompareItems}
                        className="flex items-center space-x-2"
                      >
                        <ArrowsRightLeftIcon className="h-4 w-4" />
                        <span>Compare</span>
                      </Button>
                    </>
                  )}
                  
                  <Link href="/analyze">
                    <Button className="flex items-center space-x-2">
                      <SparklesIcon className="h-4 w-4" />
                      <span>New Analysis</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search analyses..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Quick Filter Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg border transition-colors ${
                        showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FunnelIcon className="h-4 w-4" />
                      <span>Filters</span>
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  {filteredItems.length} of {historyItems.length} analyses
                </div>
              </div>

              {/* Extended Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All time</option>
                      <option value="today">Today</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
                      <option value="year">Past year</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Risk Level</label>
                    <select
                      value={filters.aiRiskLevel}
                      onChange={(e) => handleFilterChange('aiRiskLevel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All levels</option>
                      <option value="low">Low (0-20%)</option>
                      <option value="medium">Medium (21-60%)</option>
                      <option value="high">High (61%+)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Authenticity</label>
                    <select
                      value={filters.authenticityLevel}
                      onChange={(e) => handleFilterChange('authenticityLevel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All levels</option>
                      <option value="high">High (85%+)</option>
                      <option value="medium">Medium (60-84%)</option>
                      <option value="low">Low (&lt;60%)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <div className="flex space-x-1">
                      <select
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="date">Date</option>
                        <option value="title">Title</option>
                        <option value="ai_risk">AI Risk</option>
                        <option value="authenticity">Authenticity</option>
                      </select>
                      <button
                        onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* History List */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {historyItems.length === 0 ? 'No analyses yet' : 'No matching analyses'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  {historyItems.length === 0 
                    ? 'Start analyzing your writing to build up your history and track improvements over time.'
                    : 'Try adjusting your filters to see more results.'
                  }
                </p>
                {historyItems.length === 0 && (
                  <Link href="/analyze">
                    <Button className="flex items-center space-x-2">
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>Analyze Your First Text</span>
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="relative hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox or action buttons
                      const target = e.target as HTMLElement
                      if (
                        target.tagName === 'INPUT' || 
                        target.tagName === 'BUTTON' ||
                        target.closest('button') ||
                        target.closest('a')
                      ) {
                        return
                      }
                      // Navigate to analysis page
                      window.location.href = `/analyze?sample_id=${item.id}`
                    }}
                  >
                    <div className="py-3 px-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                              {/* Ultra minimal - title and date only */}
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-gray-900 truncate">
                                  {item.title || 'Analysis'} - {new Date(item.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                </h3>
                              </div>
                              
                              {/* Single line preview and metrics */}
                              <div className="flex items-center justify-between">
                                <p className="text-gray-500 text-sm truncate flex-1 mr-4">
                                  {item.content?.substring(0, 80) || ''}
                                </p>
                                
                                {/* Minimal badges on right */}
                                <div className="flex items-center space-x-3 text-xs flex-shrink-0">
                                  <span className="text-gray-500">{formatDate(item.created_at)}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-500">{Math.round((item.content?.length || 0) / 5)} words</span>
                                  
                                  <span className={`${getRiskColor(item.ai_confidence_score || 0)} px-1.5 py-0.5 rounded font-medium`}>
                                    AI {Math.round(item.ai_confidence_score || 0)}%
                                  </span>
                                  <span className={`${getAuthenticityColor(item.authenticity_score || 0)} font-medium`}>
                                    {Math.round(item.authenticity_score || 0)}% authentic
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action buttons - more subtle until hover */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/analyze?sample_id=${item.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="p-2">
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                              
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="p-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(`/api/export/analysis/${item.id}?format=pdf`, '_blank')
                                }}
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Load More Button */}
            {!isLoading && pagination.hasMore && (
              <div className="mt-6 text-center">
                <Button
                  onClick={handleLoadMore}
                  loading={isLoadingMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  size="lg"
                >
                  {isLoadingMore ? 'Loading...' : `Load More (${pagination.total - historyItems.length} remaining)`}
                </Button>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ErrorBoundary>
  )
}