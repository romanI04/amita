export interface User {
  id: string;
  email: string;
  full_name?: string;
  writing_level?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  writing_level?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  ai_usage_frequency?: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
  primary_goals?: string[];
  onboarded?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WritingSample {
  id: string;
  user_id: string;
  title: string;
  content: string;
  file_url?: string;
  file_name?: string;
  file_type?: 'txt' | 'pdf' | 'docx';
  ai_confidence_score?: number;
  authenticity_score?: number;
  voice_fingerprint?: VoiceFingerprint;
  created_at: string;
  updated_at: string;
}

export interface VoiceFingerprint {
  avg_sentence_length: number;
  vocabulary_diversity: number;
  tone_characteristics: {
    formal: number;
    casual: number;
    technical: number;
    creative: number;
  };
  style_patterns: {
    passive_voice_usage: number;
    complex_sentences: number;
    punctuation_style: Record<string, number>;
  };
  characteristic_words: string[];
}

export interface VoiceAnalysis {
  id: string;
  user_id: string;
  sample_id: string;
  style_characteristics: StyleCharacteristics;
  improvement_suggestions: string[];
  ai_detected_sections: AIDetectedSection[];
  overall_score: AnalysisScore;
  created_at: string;
}

export interface StyleCharacteristics {
  sentence_structure: {
    avg_length: number;
    complexity_score: number;
    variety_score: number;
  };
  vocabulary: {
    diversity_index: number;
    sophistication_level: number;
    unique_word_ratio: number;
  };
  tone_analysis: {
    formality: number;
    emotion: number;
    confidence: number;
  };
}

export interface AIDetectedSection {
  start_index: number;
  end_index: number;
  confidence: number;
  reason: string;
  suggested_revision?: string;
}

export interface AnalysisScore {
  authenticity: number;
  ai_likelihood: number;
  voice_consistency: number;
  overall_quality: number;
}

export interface ProgressTracking {
  id: string;
  user_id: string;
  metric_type: 'authenticity' | 'ai_detection_risk' | 'voice_consistency' | 'writing_frequency';
  value: number;
  recorded_at: string;
}

export interface OnboardingData {
  full_name: string;
  writing_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  ai_usage_frequency: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
  primary_goals: string[];
}

export interface DashboardStats {
  voice_health_score: number;
  ai_detection_risk: 'low' | 'medium' | 'high';
  authenticity_trend: TrendData[];
  total_samples: number;
  improvement_streak: number;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface CoachingTip {
  id: string;
  title: string;
  description: string;
  category: 'style' | 'authenticity' | 'detection' | 'improvement';
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number;
}

export interface FileUploadResult {
  success: boolean;
  file_url?: string;
  file_name?: string;
  error?: string;
}

export interface AnalysisRequest {
  text: string;
  title?: string;
  file_info?: {
    url: string;
    name: string;
    type: string;
  };
}

export interface AnalysisResponse {
  id?: string;
  ai_confidence_score: number;
  authenticity_score: number;
  voice_fingerprint: VoiceFingerprint;
  detected_sections: AIDetectedSection[];
  improvement_suggestions: string[];
  style_analysis: StyleCharacteristics;
  overall_score?: {
    authenticity: number;
    ai_likelihood: number;
  };
}

export interface XAIAnalysisRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export interface XAIAnalysisResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Voiceprint Types
export interface Voiceprint {
  id: string;
  user_id: string;
  name: string;
  language: string;
  status: 'active' | 'computing' | 'failed';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceprintSample {
  id: string;
  voiceprint_id: string;
  title: string;
  source: string;
  content: string;
  word_count: number;
  created_at: string;
}

export interface StylometricMetrics {
  typeTokenRatio: number;
  uniqueWordRatio: number;
  averageWordLength: number;
  averageSentenceLength: number;
  sentenceLengthStdDev: number;
  complexSentenceRatio: number;
  punctuationDensity: Record<string, number>;
  clauseRatio: number;
  passiveVoiceRatio: number;
  rareWordRatio: number;
  clicheRatio: number;
  formalityScore: number;
}

export interface SemanticSignature {
  centroidVector: number[] | null;
  semanticCohesion: number;
  topicDiversity: number;
  distinctiveUnigrams: Array<{ word: string; frequency: number; distinctiveness: number }>;
  distinctiveBigrams: Array<{ phrase: string; frequency: number; distinctiveness: number }>;
  distinctiveTrigrams: Array<{ phrase: string; frequency: number; distinctiveness: number }>;
  vocabularyRichness: number;
  conceptualDepth: number;
  writingTempo: number;
}

export interface VoiceprintTraits {
  id: string;
  voiceprint_id: string;
  version: number;
  stylometric_metrics: StylometricMetrics;
  semantic_signature: SemanticSignature;
  trait_summary: {
    signature_traits: SignatureTrait[];
    pitfalls: Pitfall[];
    summary: string;
  };
  target_thresholds: TargetThresholds;
  created_at: string;
}

export interface SignatureTrait {
  id: string;
  name: string;
  description: string;
  strength: number;
  category: 'lexical' | 'structural' | 'semantic' | 'stylistic';
}

export interface Pitfall {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
  category: 'clarity' | 'engagement' | 'consistency' | 'formality';
}

export interface TargetThresholds {
  typeTokenRatio: { min: number; max: number; optimal: number };
  averageWordLength: { min: number; max: number; optimal: number };
  averageSentenceLength: { min: number; max: number; optimal: number };
  complexSentenceRatio: { min: number; max: number; optimal: number };
  formalityScore: { min: number; max: number; optimal: number };
  vocabularyRichness: { min: number; max: number; optimal: number };
  semanticCohesion: { min: number; max: number; optimal: number };
  conceptualDepth: { min: number; max: number; optimal: number };
}