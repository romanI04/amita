// Metrics definitions and dashboard configuration for amita.ai analytics

export interface MetricDefinition {
  name: string
  description: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  unit?: string
  labels?: string[]
}

// Business Metrics - Key Performance Indicators
export const BUSINESS_METRICS: Record<string, MetricDefinition> = {
  // User Engagement
  voice_profiles_created: {
    name: 'voice_profiles_created_total',
    description: 'Total number of voice profiles created',
    type: 'counter',
    labels: ['user_tier', 'signup_source']
  },
  
  analyses_completed: {
    name: 'analyses_completed_total', 
    description: 'Total number of text analyses completed',
    type: 'counter',
    labels: ['text_length_bucket', 'domain']
  },
  
  samples_uploaded: {
    name: 'samples_uploaded_total',
    description: 'Total number of writing samples uploaded',
    type: 'counter', 
    labels: ['upload_type', 'word_count_bucket']
  },
  
  rewrites_applied: {
    name: 'rewrites_applied_total',
    description: 'Total number of AI rewrites applied by users',
    type: 'counter',
    labels: ['sections_count', 'risk_reduction_bucket']
  },
  
  suggestions_accepted: {
    name: 'suggestions_accepted_total',
    description: 'Total number of writing suggestions accepted',
    type: 'counter',
    labels: ['suggestion_type', 'authenticity_impact']
  },
  
  // User Retention
  daily_active_users: {
    name: 'daily_active_users',
    description: 'Number of users active in the last 24 hours',
    type: 'gauge'
  },
  
  weekly_active_users: {
    name: 'weekly_active_users', 
    description: 'Number of users active in the last 7 days',
    type: 'gauge'
  },
  
  monthly_active_users: {
    name: 'monthly_active_users',
    description: 'Number of users active in the last 30 days', 
    type: 'gauge'
  },
  
  // Quality Metrics
  average_authenticity_score: {
    name: 'average_authenticity_score',
    description: 'Average authenticity score across all analyses',
    type: 'gauge',
    labels: ['domain', 'time_period']
  },
  
  average_risk_score: {
    name: 'average_risk_score', 
    description: 'Average AI detection risk score across all analyses',
    type: 'gauge',
    labels: ['domain', 'time_period']
  }
}

// Performance Metrics - System Performance Indicators  
export const PERFORMANCE_METRICS: Record<string, MetricDefinition> = {
  // API Performance
  api_request_duration: {
    name: 'api_request_duration_seconds',
    description: 'Duration of API requests',
    type: 'histogram',
    unit: 'seconds',
    labels: ['endpoint', 'method', 'status_code']
  },
  
  api_requests_total: {
    name: 'api_requests_total',
    description: 'Total number of API requests',
    type: 'counter', 
    labels: ['endpoint', 'method', 'status_code']
  },
  
  // XAI API Performance
  xai_api_duration: {
    name: 'xai_api_duration_seconds',
    description: 'Duration of xAI API calls',
    type: 'histogram',
    unit: 'seconds',
    labels: ['operation', 'model', 'success']
  },
  
  xai_api_tokens: {
    name: 'xai_api_tokens_total',
    description: 'Total tokens consumed from xAI API',
    type: 'counter',
    labels: ['operation', 'model']
  },
  
  // Database Performance
  supabase_query_duration: {
    name: 'supabase_query_duration_seconds', 
    description: 'Duration of Supabase database queries',
    type: 'histogram',
    unit: 'seconds',
    labels: ['operation', 'table', 'success']
  },
  
  // Frontend Performance
  page_load_time: {
    name: 'page_load_time_seconds',
    description: 'Time to load pages',
    type: 'histogram', 
    unit: 'seconds',
    labels: ['page_path', 'user_tier']
  },
  
  component_render_time: {
    name: 'component_render_time_seconds',
    description: 'Time to render React components',
    type: 'histogram',
    unit: 'seconds',
    labels: ['component_name', 'props_complexity']
  },
  
  memory_usage: {
    name: 'browser_memory_usage_bytes',
    description: 'Browser memory usage',
    type: 'gauge',
    unit: 'bytes',
    labels: ['page_path', 'user_session_length']
  }
}

// Error Metrics - System Health Indicators
export const ERROR_METRICS: Record<string, MetricDefinition> = {
  errors_total: {
    name: 'errors_total',
    description: 'Total number of errors by type',
    type: 'counter',
    labels: ['error_type', 'component', 'severity']
  },
  
  api_errors_total: {
    name: 'api_errors_total', 
    description: 'Total number of API errors',
    type: 'counter',
    labels: ['endpoint', 'status_code', 'error_class']
  },
  
  xai_api_errors_total: {
    name: 'xai_api_errors_total',
    description: 'Total number of xAI API errors', 
    type: 'counter',
    labels: ['operation', 'error_type']
  }
}

// Dashboard Configuration
export const DASHBOARD_CONFIG = {
  // Real-time metrics (updated every 30 seconds)
  realtime: [
    'daily_active_users',
    'api_requests_total',
    'errors_total',
    'analyses_completed'
  ],
  
  // Hourly aggregated metrics
  hourly: [
    'average_authenticity_score', 
    'average_risk_score',
    'api_request_duration',
    'xai_api_duration'
  ],
  
  // Daily aggregated metrics
  daily: [
    'voice_profiles_created',
    'samples_uploaded',
    'rewrites_applied', 
    'suggestions_accepted',
    'weekly_active_users'
  ],
  
  // Critical alerts
  alerts: {
    high_error_rate: {
      metric: 'errors_total',
      threshold: '> 100/hour',
      severity: 'critical'
    },
    slow_api_responses: {
      metric: 'api_request_duration',
      threshold: 'p95 > 5s',
      severity: 'warning' 
    },
    xai_api_failures: {
      metric: 'xai_api_errors_total',
      threshold: '> 10/hour',
      severity: 'critical'
    },
    low_authenticity_scores: {
      metric: 'average_authenticity_score',
      threshold: '< 70',
      severity: 'warning'
    }
  }
}

// Utility functions for metric calculations
export const calculateBuckets = {
  textLength: (length: number): string => {
    if (length < 100) return 'very_short'
    if (length < 500) return 'short' 
    if (length < 2000) return 'medium'
    if (length < 5000) return 'long'
    return 'very_long'
  },
  
  wordCount: (count: number): string => {
    if (count < 50) return 'micro'
    if (count < 200) return 'small'
    if (count < 1000) return 'medium' 
    if (count < 5000) return 'large'
    return 'massive'
  },
  
  riskReduction: (reduction: number): string => {
    if (reduction < 5) return 'minimal'
    if (reduction < 15) return 'moderate'
    if (reduction < 30) return 'significant'
    return 'major'
  },
  
  authenticityImpact: (impact: number): string => {
    if (impact < 5) return 'negligible'
    if (impact < 15) return 'minor'
    if (impact < 30) return 'moderate' 
    return 'substantial'
  }
}

// Export configurations for external monitoring tools (Grafana, DataDog, etc.)
export const GRAFANA_CONFIG = {
  dashboards: [
    {
      title: 'amita.ai Business Metrics',
      panels: [
        { title: 'Daily Active Users', metric: 'daily_active_users' },
        { title: 'Analyses Completed', metric: 'analyses_completed' },
        { title: 'Voice Profiles Created', metric: 'voice_profiles_created' },
        { title: 'Average Authenticity Score', metric: 'average_authenticity_score' }
      ]
    },
    {
      title: 'amita.ai Performance',
      panels: [
        { title: 'API Response Time', metric: 'api_request_duration' },
        { title: 'xAI API Performance', metric: 'xai_api_duration' },
        { title: 'Error Rate', metric: 'errors_total' },
        { title: 'Memory Usage', metric: 'memory_usage' }
      ]
    }
  ]
}