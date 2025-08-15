'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useVoiceProfile } from '@/lib/context/VoiceProfileContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { 
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  CogIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'

interface UserSettings {
  // Account settings
  full_name: string
  email: string
  writing_level: 'beginner' | 'intermediate' | 'advanced' | 'professional'
  
  // Analysis preferences  
  default_domain: 'General' | 'Academic' | 'Email' | 'Creative'
  auto_save_analyses: boolean
  show_improvement_tips: boolean
  enable_voice_notifications: boolean
  
  // Privacy settings
  data_retention_days: number
  allow_analytics_tracking: boolean
  anonymize_exports: boolean
  
  // Export preferences
  default_export_format: 'pdf' | 'docx' | 'txt' | 'json'
  include_versions_in_export: boolean
  include_metadata_in_export: boolean
  
  // Notification preferences
  email_notifications: boolean
  analysis_completion_notifications: boolean
  weekly_progress_reports: boolean
  feature_announcements: boolean
}

const WRITING_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Just starting out with writing' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some writing experience' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced writer' },
  { value: 'professional', label: 'Professional', description: 'Professional writer or editor' }
]

const DOMAIN_OPTIONS = [
  { value: 'General', label: 'General', description: 'Everyday writing and communication' },
  { value: 'Academic', label: 'Academic', description: 'Research papers and scholarly writing' },
  { value: 'Email', label: 'Email', description: 'Professional correspondence' },
  { value: 'Creative', label: 'Creative', description: 'Creative writing and storytelling' }
]

const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', description: 'Formatted document' },
  { value: 'docx', label: 'Word Document', description: 'Microsoft Word format' },
  { value: 'txt', label: 'Plain Text', description: 'Simple text file' },
  { value: 'json', label: 'JSON', description: 'Structured data format' }
]

const DATA_RETENTION_OPTIONS = [
  { value: 30, label: '30 days', description: 'Delete after 1 month' },
  { value: 90, label: '90 days', description: 'Delete after 3 months' },
  { value: 365, label: '1 year', description: 'Delete after 1 year' },
  { value: -1, label: 'Never', description: 'Keep forever' }
]

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { state: voiceProfileState } = useVoiceProfile()
  const { showToast } = useToast()
  
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'privacy' | 'notifications'>('account')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDataExport, setShowDataExport] = useState(false)
  const [exportProgress, setExportProgress] = useState<number | null>(null)
  const [fieldSaving, setFieldSaving] = useState<{ [key: string]: boolean }>({})
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load user settings
  useEffect(() => {
    if (!user) return

    const loadSettings = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/user/settings?user_id=${user.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to load settings')
        }

        const data = await response.json()
        setSettings({
          // Default values with loaded data
          full_name: profile?.full_name || '',
          email: user.email || '',
          writing_level: profile?.writing_level || 'intermediate',
          default_domain: 'General',
          auto_save_analyses: true,
          show_improvement_tips: true,
          enable_voice_notifications: true,
          data_retention_days: 365,
          allow_analytics_tracking: true,
          anonymize_exports: false,
          default_export_format: 'pdf',
          include_versions_in_export: true,
          include_metadata_in_export: false,
          email_notifications: true,
          analysis_completion_notifications: true,
          weekly_progress_reports: false,
          feature_announcements: true,
          ...data.settings
        })
      } catch (err) {
        console.error('Settings loading error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [user, profile])

  const handleSettingChange = async (key: keyof UserSettings, value: any, autoSave: boolean = false) => {
    if (!settings) return
    
    // Validation
    const errors = { ...validationErrors }
    
    if (key === 'full_name' && value) {
      if (value.length < 2) {
        errors.full_name = 'Name must be at least 2 characters'
      } else if (value.length > 100) {
        errors.full_name = 'Name must be less than 100 characters'
      } else {
        delete errors.full_name
      }
    }
    
    setValidationErrors(errors)
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
    setHasUnsavedChanges(true)
    
    // Auto-save for toggle switches
    if (autoSave && !errors[key]) {
      setFieldSaving(prev => ({ ...prev, [key]: true }))
      
      try {
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
        
        const response = await fetch('/api/user/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value })
        })
        
        if (response.ok) {
          showToast(`${key.replace(/_/g, ' ')} updated`, 'success')
          setHasUnsavedChanges(false)
        }
      } catch (err) {
        showToast('Failed to save setting', 'error')
      } finally {
        setFieldSaving(prev => ({ ...prev, [key]: false }))
      }
    }
  }

  const handleSaveSettings = async () => {
    if (!settings || !user) return
    
    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      showToast('Please fix validation errors before saving', 'error')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: settings
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      // Update profile if name or writing level changed
      if (settings.full_name !== profile?.full_name || settings.writing_level !== profile?.writing_level) {
        await updateProfile({
          full_name: settings.full_name,
          writing_level: settings.writing_level
        })
      }

      showToast('Settings saved successfully!', 'success')
      setHasUnsavedChanges(false)
      setSuccessMessage('Settings saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (err) {
      console.error('Settings save error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to save settings'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!user) return

    setShowDataExport(true)
    setExportProgress(0)

    try {
      const response = await fetch('/api/user/export-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          include_analyses: true,
          include_voice_profile: true,
          include_settings: true,
          format: 'zip'
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev === null || prev >= 90) return prev
          return prev + Math.random() * 20
        })
      }, 500)

      const blob = await response.blob()
      clearInterval(progressInterval)
      setExportProgress(100)

      // Download file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `amita-data-export-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setTimeout(() => {
        setShowDataExport(false)
        setExportProgress(null)
      }, 2000)

    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to export data. Please try again.')
      setShowDataExport(false)
      setExportProgress(null)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || !showDeleteConfirm) return

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: true
        })
      })

      if (!response.ok) {
        throw new Error('Account deletion failed')
      }

      // Sign out and redirect
      await signOut()
      window.location.href = '/?deleted=true'

    } catch (err) {
      console.error('Account deletion error:', err)
      setError('Failed to delete account. Please contact support.')
    }
  }

  const tabs = [
    { id: 'account', label: 'Account', icon: UserCircleIcon },
    { id: 'preferences', label: 'Preferences', icon: CogIcon },
    { id: 'privacy', label: 'Privacy', icon: ShieldCheckIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon }
  ]

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 bg-gray-50">
          <div className="max-w-4xl mx-auto py-8 px-6">
            <SkeletonLoader variant="card" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!settings) {
    return (
      <AppLayout>
        <div className="flex-1 bg-gray-50">
          <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load settings</h3>
              <p className="text-gray-500 mb-6">{error || 'Unable to load your settings'}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="flex-1 bg-gray-50">
          <div className="max-w-4xl mx-auto py-8 px-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
              <p className="text-gray-600">Manage your account, preferences, and privacy settings</p>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <p className="text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Account Tab */}
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Input
                            label="Full Name"
                            value={settings.full_name}
                            onChange={(e) => handleSettingChange('full_name', e.target.value)}
                            placeholder="Enter your full name"
                            error={validationErrors.full_name}
                          />
                          {fieldSaving.full_name && (
                            <p className="text-xs text-blue-600 mt-1">Saving...</p>
                          )}
                        </div>
                        
                        <div>
                          <Input
                            label="Email Address"
                            type="email"
                            value={settings.email}
                            disabled
                            className="bg-gray-50"
                          />
                          <p className="text-sm text-gray-500 mt-1">Contact support to change your email</p>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Writing Level</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {WRITING_LEVELS.map((level) => (
                              <button
                                key={level.value}
                                onClick={() => handleSettingChange('writing_level', level.value)}
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                  settings.writing_level === level.value
                                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                <div className="font-medium">{level.label}</div>
                                <div className="text-sm text-gray-500">{level.description}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Profile</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Current Voice Profile</p>
                            <p className="text-sm text-gray-600">
                              {voiceProfileState.coverage.sampleCount} samples, {voiceProfileState.coverage.wordCount.toLocaleString()} words
                            </p>
                          </div>
                          <div className="flex space-x-3">
                            <Button variant="outline" size="sm">
                              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                              Export Profile
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Reset Profile
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Preferences</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Default Domain</label>
                          <select
                            value={settings.default_domain}
                            onChange={(e) => handleSettingChange('default_domain', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {DOMAIN_OPTIONS.map((domain) => (
                              <option key={domain.value} value={domain.value}>
                                {domain.label} - {domain.description}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Auto-save analyses</p>
                            <p className="text-sm text-gray-600">Automatically save your analyses as you work</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('auto_save_analyses', !settings.auto_save_analyses, true)}
                            disabled={fieldSaving.auto_save_analyses}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.auto_save_analyses ? 'bg-blue-600' : 'bg-gray-200'
                            } ${
                              fieldSaving.auto_save_analyses ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.auto_save_analyses ? 'translate-x-6' : 'translate-x-1'
                              } ${
                                fieldSaving.auto_save_analyses ? 'animate-pulse' : ''
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Show improvement tips</p>
                            <p className="text-sm text-gray-600">Display helpful tips during analysis</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('show_improvement_tips', !settings.show_improvement_tips, true)}
                            disabled={fieldSaving.show_improvement_tips}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.show_improvement_tips ? 'bg-blue-600' : 'bg-gray-200'
                            } ${
                              fieldSaving.show_improvement_tips ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.show_improvement_tips ? 'translate-x-6' : 'translate-x-1'
                              } ${
                                fieldSaving.show_improvement_tips ? 'animate-pulse' : ''
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Voice notifications</p>
                            <p className="text-sm text-gray-600">Get notified when voice constraints change</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('enable_voice_notifications', !settings.enable_voice_notifications)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.enable_voice_notifications ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.enable_voice_notifications ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Export Preferences</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Default Export Format</label>
                          <select
                            value={settings.default_export_format}
                            onChange={(e) => handleSettingChange('default_export_format', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {EXPORT_FORMATS.map((format) => (
                              <option key={format.value} value={format.value}>
                                {format.label} - {format.description}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Include versions in exports</p>
                            <p className="text-sm text-gray-600">Include revision history in exported files</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('include_versions_in_export', !settings.include_versions_in_export)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.include_versions_in_export ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.include_versions_in_export ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Include metadata in exports</p>
                            <p className="text-sm text-gray-600">Include analysis details and scores</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('include_metadata_in_export', !settings.include_metadata_in_export)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.include_metadata_in_export ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.include_metadata_in_export ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Tab */}
                {activeTab === 'privacy' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Data & Privacy</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention</label>
                          <select
                            value={settings.data_retention_days}
                            onChange={(e) => handleSettingChange('data_retention_days', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {DATA_RETENTION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label} - {option.description}
                              </option>
                            ))}
                          </select>
                          <p className="text-sm text-gray-500 mt-1">How long to keep your analyses and data</p>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Analytics tracking</p>
                            <p className="text-sm text-gray-600">Allow usage analytics to improve the service</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('allow_analytics_tracking', !settings.allow_analytics_tracking)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.allow_analytics_tracking ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.allow_analytics_tracking ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Anonymize exports</p>
                            <p className="text-sm text-gray-600">Remove personal identifiers from exported data</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('anonymize_exports', !settings.anonymize_exports)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.anonymize_exports ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.anonymize_exports ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Export all data</p>
                            <p className="text-sm text-gray-600">Download all your analyses, settings, and voice profile</p>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={handleExportData}
                            disabled={showDataExport}
                            className="flex items-center space-x-2"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span>{showDataExport ? 'Exporting...' : 'Export Data'}</span>
                          </Button>
                        </div>

                        {showDataExport && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1">
                                <p className="text-blue-800 font-medium">Preparing your data export...</p>
                                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${exportProgress || 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-4 border border-red-300 rounded-lg bg-red-50">
                          <div>
                            <p className="font-medium text-red-900">Delete account</p>
                            <p className="text-sm text-red-700">Permanently delete your account and all associated data</p>
                          </div>
                          <Button 
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                            className="text-red-600 border-red-300 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span>Delete Account</span>
                          </Button>
                        </div>

                        {showDeleteConfirm && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="mb-4">
                              <h4 className="font-medium text-red-900 mb-2">Are you absolutely sure?</h4>
                              <p className="text-sm text-red-700">
                                This action cannot be undone. This will permanently delete your account, 
                                voice profile, all analyses, and remove all associated data from our servers.
                              </p>
                            </div>
                            <div className="flex space-x-3">
                              <Button
                                onClick={handleDeleteAccount}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Yes, delete my account
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowDeleteConfirm(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Email notifications</p>
                            <p className="text-sm text-gray-600">Receive notifications via email</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('email_notifications', !settings.email_notifications)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Analysis completion</p>
                            <p className="text-sm text-gray-600">Get notified when analysis is complete</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('analysis_completion_notifications', !settings.analysis_completion_notifications)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.analysis_completion_notifications ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.analysis_completion_notifications ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Weekly progress reports</p>
                            <p className="text-sm text-gray-600">Receive weekly summaries of your writing progress</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('weekly_progress_reports', !settings.weekly_progress_reports)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.weekly_progress_reports ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.weekly_progress_reports ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-900">Feature announcements</p>
                            <p className="text-sm text-gray-600">Get updates about new features and improvements</p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('feature_announcements', !settings.feature_announcements)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings.feature_announcements ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.feature_announcements ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex items-center justify-between">
                  {hasUnsavedChanges && (
                    <p className="text-sm text-amber-600 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      You have unsaved changes
                    </p>
                  )}
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving || Object.keys(validationErrors).length > 0}
                    className="flex items-center space-x-2 ml-auto"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ErrorBoundary>
  )
}