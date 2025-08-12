-- Analytics events table for comprehensive logging and metrics tracking
-- This table stores all user actions, system events, performance metrics, and business metrics

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- e.g., 'user.analyze', 'system.voice_profile_created', 'performance.api_call'
  event_category TEXT NOT NULL CHECK (event_category IN ('user_action', 'system_event', 'performance', 'error', 'business_metric')),
  
  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  
  -- Event data
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Performance metrics (nullable, only for performance events)
  performance_metrics JSONB,
  
  -- Request context
  page_path TEXT,
  user_agent TEXT,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp ON analytics_events(user_id, timestamp);

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata ON analytics_events USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_analytics_events_performance ON analytics_events USING GIN(performance_metrics);

-- RLS policies for data access control
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can only access their own events
CREATE POLICY "Users can view their own analytics events"
  ON analytics_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can access all events (for admin/analytics dashboards)
CREATE POLICY "Service role can access all analytics events"
  ON analytics_events
  FOR ALL
  TO service_role
  USING (true);

-- Analytics service can insert events
CREATE POLICY "Authenticated users can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Partitioning by month for better performance (optional, for high-volume apps)
-- This can be implemented later if needed

-- Function to clean up old analytics data (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS void AS $$
BEGIN
  -- Delete events older than 1 year
  DELETE FROM analytics_events 
  WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run cleanup monthly (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-analytics', '0 0 1 * *', 'SELECT cleanup_old_analytics_events();');

-- Views for common analytics queries
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  user_id,
  DATE_TRUNC('day', timestamp) as day,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_category = 'user_action' THEN 1 END) as user_actions,
  COUNT(CASE WHEN event_category = 'system_event' THEN 1 END) as system_events,
  COUNT(CASE WHEN event_category = 'business_metric' THEN 1 END) as business_events,
  COUNT(CASE WHEN event_category = 'error' THEN 1 END) as error_events
FROM analytics_events
WHERE user_id IS NOT NULL
GROUP BY user_id, DATE_TRUNC('day', timestamp);

CREATE OR REPLACE VIEW performance_metrics_summary AS
SELECT 
  event_type,
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as event_count,
  AVG((performance_metrics->>'duration_ms')::numeric) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (performance_metrics->>'duration_ms')::numeric) as p95_duration_ms,
  MAX((performance_metrics->>'duration_ms')::numeric) as max_duration_ms
FROM analytics_events
WHERE event_category = 'performance' 
  AND performance_metrics->>'duration_ms' IS NOT NULL
GROUP BY event_type, DATE_TRUNC('hour', timestamp);

CREATE OR REPLACE VIEW business_metrics_daily AS
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  event_type,
  COUNT(*) as event_count,
  SUM((metadata->>'metric_value')::numeric) as total_value
FROM analytics_events
WHERE event_category = 'business_metric'
GROUP BY DATE_TRUNC('day', timestamp), event_type
ORDER BY day DESC;