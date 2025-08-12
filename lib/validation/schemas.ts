// Validation schemas for API routes
// Defines input constraints and validation rules for each endpoint

export interface ValidationError {
  code: 'BAD_REQUEST';
  message: string;
  details: {
    field?: string;
    expected?: string;
    received?: unknown;
    constraint?: string;
  };
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: ValidationError;
}

// Base validation schema interface
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    enum?: readonly string[];
    maxItems?: number;
    minItems?: number;
    pattern?: RegExp;
    itemSchema?: ValidationSchema[string];
  };
}

// Writing analysis constraints
const TEXT_MIN_LENGTH = 50;
const TEXT_MAX_LENGTH = 10000;
const TITLE_MAX_LENGTH = 200;

// User settings constraints
const NAME_MAX_LENGTH = 100;
const RETENTION_DAYS_OPTIONS = [30, 90, 365, -1] as const;
const WRITING_LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'] as const;
const DOMAIN_OPTIONS = ['General', 'Academic', 'Email', 'Creative'] as const;
const EXPORT_FORMATS = ['pdf', 'docx', 'txt', 'json'] as const;

// Voice profile constraints
const VOICEPRINT_NAME_MAX_LENGTH = 100;
const SAMPLES_MIN_COUNT = 3;
const SAMPLES_MAX_COUNT = 5;
const SAMPLE_TITLE_MAX_LENGTH = 150;
const SAMPLE_CONTENT_MIN_LENGTH = 50;
const SAMPLE_CONTENT_MAX_LENGTH = 5000;

// Export constraints
const EXPORT_MAX_ITEMS = 1000;

// Analysis API Schema
export const analyzeSchema: ValidationSchema = {
  text: {
    type: 'string',
    required: true,
    minLength: TEXT_MIN_LENGTH,
    maxLength: TEXT_MAX_LENGTH
  },
  title: {
    type: 'string',
    required: false,
    maxLength: TITLE_MAX_LENGTH
  },
  file_info: {
    type: 'object',
    required: false
  }
};

// Save Version API Schema
export const saveVersionSchema: ValidationSchema = {
  title: {
    type: 'string',
    required: false,
    maxLength: TITLE_MAX_LENGTH
  },
  original_text: {
    type: 'string',
    required: true,
    minLength: TEXT_MIN_LENGTH,
    maxLength: TEXT_MAX_LENGTH
  },
  revised_text: {
    type: 'string',
    required: false,
    maxLength: TEXT_MAX_LENGTH
  },
  applied_changes: {
    type: 'number',
    required: false,
    min: 0,
    max: 1000
  },
  analysis_data: {
    type: 'object',
    required: false
  }
};

// User Settings API Schema
export const userSettingsSchema: ValidationSchema = {
  settings: {
    type: 'object',
    required: true
  }
};

// User Settings Object Schema (nested validation)
export const userSettingsObjectSchema: ValidationSchema = {
  full_name: {
    type: 'string',
    required: false,
    maxLength: NAME_MAX_LENGTH
  },
  writing_level: {
    type: 'string',
    required: false,
    enum: WRITING_LEVELS
  },
  default_domain: {
    type: 'string',
    required: false,
    enum: DOMAIN_OPTIONS
  },
  auto_save_analyses: {
    type: 'boolean',
    required: false
  },
  show_improvement_tips: {
    type: 'boolean',
    required: false
  },
  enable_voice_notifications: {
    type: 'boolean',
    required: false
  },
  data_retention_days: {
    type: 'number',
    required: false,
    enum: RETENTION_DAYS_OPTIONS as any
  },
  allow_analytics_tracking: {
    type: 'boolean',
    required: false
  },
  anonymize_exports: {
    type: 'boolean',
    required: false
  },
  default_export_format: {
    type: 'string',
    required: false,
    enum: EXPORT_FORMATS
  },
  include_versions_in_export: {
    type: 'boolean',
    required: false
  },
  include_metadata_in_export: {
    type: 'boolean',
    required: false
  },
  email_notifications: {
    type: 'boolean',
    required: false
  },
  analysis_completion_notifications: {
    type: 'boolean',
    required: false
  },
  weekly_progress_reports: {
    type: 'boolean',
    required: false
  },
  feature_announcements: {
    type: 'boolean',
    required: false
  }
};

// Delete Account API Schema
export const deleteAccountSchema: ValidationSchema = {
  confirmation: {
    type: 'boolean',
    required: true
  }
};

// Export All Data API Schema
export const exportAllSchema: ValidationSchema = {
  include_analyses: {
    type: 'boolean',
    required: false
  },
  include_voice_profile: {
    type: 'boolean',
    required: false
  },
  include_settings: {
    type: 'boolean',
    required: false
  },
  format: {
    type: 'string',
    required: false,
    enum: ['zip']
  }
};

// Voiceprint Creation API Schema
export const createVoiceprintSchema: ValidationSchema = {
  samples: {
    type: 'array',
    required: false,
    minItems: SAMPLES_MIN_COUNT,
    maxItems: SAMPLES_MAX_COUNT,
    itemSchema: {
      type: 'object'
    }
  },
  user_id: {
    type: 'string',
    required: false
  },
  name: {
    type: 'string',
    required: false,
    maxLength: VOICEPRINT_NAME_MAX_LENGTH
  },
  language: {
    type: 'string',
    required: false,
    enum: ['en']
  }
};

// Voiceprint Sample Schema (nested validation)
export const voiceprintSampleSchema: ValidationSchema = {
  title: {
    type: 'string',
    required: true,
    maxLength: SAMPLE_TITLE_MAX_LENGTH
  },
  content: {
    type: 'string',
    required: true,
    minLength: SAMPLE_CONTENT_MIN_LENGTH,
    maxLength: SAMPLE_CONTENT_MAX_LENGTH
  },
  source: {
    type: 'string',
    required: false,
    maxLength: 50
  }
};

// Voiceprint Compute API Schema
export const computeVoiceprintSchema: ValidationSchema = {
  voiceprintId: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  }
};

// Risk Estimate API Schema
export const riskEstimateSchema: ValidationSchema = {
  text: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: TEXT_MAX_LENGTH
  }
};

// Rewrite API Schema
export const rewriteSchema: ValidationSchema = {
  text: {
    type: 'string',
    required: true,
    minLength: TEXT_MIN_LENGTH,
    maxLength: TEXT_MAX_LENGTH
  },
  target_tone: {
    type: 'string',
    required: false,
    enum: ['formal', 'casual', 'professional', 'friendly', 'academic']
  }
};

// Apply Suggestion API Schema
export const applySuggestionSchema: ValidationSchema = {
  text: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: TEXT_MAX_LENGTH
  },
  suggestion: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 1000
  },
  startIndex: {
    type: 'number',
    required: true,
    min: 0
  },
  endIndex: {
    type: 'number',
    required: true,
    min: 0
  }
};

// Bulk Export API Schema
export const bulkExportSchema: ValidationSchema = {
  analysis_ids: {
    type: 'array',
    required: true,
    minItems: 1,
    maxItems: EXPORT_MAX_ITEMS,
    itemSchema: {
      type: 'string',
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    }
  },
  format: {
    type: 'string',
    required: false,
    enum: ['zip', 'pdf', 'json']
  },
  include_versions: {
    type: 'boolean',
    required: false
  }
};

// Risk Estimate API Schema (specific to current implementation)
export const riskEstimateApiSchema: ValidationSchema = {
  profileId: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  },
  flaggedLineCount: {
    type: 'number',
    required: true,
    min: 0,
    max: 10000
  },
  riskDrivers: {
    type: 'array',
    required: false,
    maxItems: 100
  },
  coverage: {
    type: 'object',
    required: false
  }
};

// Rewrite API Schema (specific to current implementation)
export const rewriteApiSchema: ValidationSchema = {
  prompt: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  originalText: {
    type: 'string',
    required: true,
    minLength: TEXT_MIN_LENGTH,
    maxLength: TEXT_MAX_LENGTH
  },
  constraints: {
    type: 'object',
    required: false
  },
  options: {
    type: 'object',
    required: false
  }
};

// Apply Suggestion API Schema (specific to current implementation)
export const applySuggestionApiSchema: ValidationSchema = {
  prompt: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  originalText: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: TEXT_MAX_LENGTH
  },
  suggestion: {
    type: 'object',
    required: true
  },
  constraints: {
    type: 'object',
    required: false
  }
};

// Export Analysis URL Parameters Schema
export const exportAnalysisParamsSchema: ValidationSchema = {
  id: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  }
};

// Export Analysis Query Parameters Schema
export const exportAnalysisQuerySchema: ValidationSchema = {
  format: {
    type: 'string',
    required: false,
    enum: ['json', 'txt', 'md', 'markdown', 'csv']
  },
  include_versions: {
    type: 'string',
    required: false,
    enum: ['true', 'false']
  },
  include_metadata: {
    type: 'string',
    required: false,
    enum: ['true', 'false']
  }
};

// User History Query Parameters Schema
export const userHistoryQuerySchema: ValidationSchema = {
  limit: {
    type: 'string',
    required: false,
    pattern: /^\d+$/
  },
  offset: {
    type: 'string',
    required: false,
    pattern: /^\d+$/
  }
};