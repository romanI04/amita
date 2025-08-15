-- Versions table for storing document versions
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sample_id UUID REFERENCES writing_samples(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  description TEXT,
  changes_applied JSONB,
  risk_score DECIMAL(5, 2),
  authenticity_score DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parent_version_id UUID REFERENCES document_versions(id),
  is_current BOOLEAN DEFAULT FALSE,
  
  -- Ensure version numbers are unique per document
  UNIQUE(sample_id, version_number)
);

-- Activity log for audit trail
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sample_id UUID REFERENCES writing_samples(id) ON DELETE CASCADE,
  version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'analyzed', 'edited', 'applied_suggestions', 'saved_version', 'restored_version', 'exported'
  action_details JSONB,
  request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_document_versions_sample_id ON document_versions(sample_id);
CREATE INDEX idx_document_versions_user_id ON document_versions(user_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_sample_id ON activity_log(sample_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- RLS Policies
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own versions
CREATE POLICY "Users can view own versions" ON document_versions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own versions" ON document_versions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own versions" ON document_versions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only access their own activity logs
CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);