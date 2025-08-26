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
  subscription_status?: string;
  subscription_tier?: string;
  trial_ends_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  is_premium?: boolean;
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
  voice_trait_preserved?: string;
  voice_trait_enhanced?: string;
  risk_delta?: number;
  authenticity_delta?: number;
  voice_similarity?: number; // 0-100 percentage
  voice_dimensions_affected?: string[];
  preserved_traits?: string[];
  voice_explanation?: string;
  application_count?: number;
  dismissed?: boolean;
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
  content?: string; // Original text that was analyzed
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

export interface VoiceEditingState {
  voiceSafeMode: boolean;
  similarityThreshold: number;
  appliedChanges: ChangeLogEntry[];
  voiceCalculations: Map<string, number>;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  originalText: string;
  modifiedText: string;
  voiceSimilarityBefore: number;
  voiceSimilarityAfter: number;
  action: 'applied' | 'dismissed' | 'reverted';
  section?: AIDetectedSection;
}

export interface VoiceImpactMetrics {
  overallSimilarity: number;
  dimensionScores: Array<{
    name: string;
    before: number;
    after: number;
    delta: number;
  }>;
  preservedTraits: string[];
  affectedTraits: string[];
  riskLevel: 'low' | 'medium' | 'high';
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
  lexical: LexicalFeatures;
  syntactic: SyntacticFeatures;
  semantic: SemanticFeatures;
  stylistic: StylisticMarkers;
  metadata: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    avgWordsPerSentence: number;
    avgSentencesPerParagraph: number;
  };
}

export interface LexicalFeatures {
  vocabularyRichness: number;
  avgWordLength: number;
  wordLengthDistribution: {
    mean: number;
    stdDev: number;
    short: number;
    medium: number;
    long: number;
  };
  uniqueWordPreferences: string[];
  commonPhrases: string[];
  lexicalDiversity: number;
}

export interface SyntacticFeatures {
  avgSentenceLength: number;
  sentenceLengthVariation: number;
  clauseComplexity: number;
  punctuationPatterns: {
    commas: number;
    semicolons: number;
    colons: number;
    dashes: number;
    exclamations: number;
    questions: number;
  };
  paragraphStructure: {
    avgParagraphLength: number;
    paragraphVariation: number;
  };
}

export interface SemanticFeatures {
  topicPreferences: string[];
  sentimentPatterns: {
    positive: number;
    negative: number;
    neutral: number;
  };
  formalityLevel: number;
  emotionalTone: string;
  abstractnessLevel: number;
}

export interface StylisticMarkers {
  transitionWordsUsage: number;
  activeVsPassiveRatio: number;
  contractionFrequency: number;
  idiomUsage: number;
  firstPersonUsage: number;
  rhetoricalDevices: string[];
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
  lexicalSignature: {
    vocabularyRichness: number;
    preferredWords: string[];
    phrasePatterns: string[];
    wordLengthProfile: {
      mean: number;
      stdDev: number;
      short: number;
      medium: number;
      long: number;
    };
  };
  syntacticSignature: {
    sentenceComplexity: number;
    punctuationStyle: {
      commas: number;
      semicolons: number;
      colons: number;
      dashes: number;
      exclamations: number;
      questions: number;
    };
    paragraphRhythm: {
      avgParagraphLength: number;
      paragraphVariation: number;
    };
  };
  semanticSignature: {
    tonalProfile: string;
    formalityLevel: number;
    topicalInterests: string[];
  };
  stylisticSignature: {
    voiceCharacteristics: {
      activeVoicePreference: number;
      contractionUsage: number;
      personalPronounUsage: number;
    };
    writingPatterns: {
      transitionStyle: number;
      rhetoricalDevices: string[];
    };
  };
  consistency: number;
  confidence: number;
}

export interface VoiceProfile {
  id: string;
  userId: string;
  traits: VoiceprintTraits;
  confidence: number;
  sampleCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceEvolution {
  driftScore: number;
  changedDimensions: string[];
  trend: 'stable' | 'evolving' | 'shifting';
  recommendations: string[];
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