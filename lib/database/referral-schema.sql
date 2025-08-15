-- Referral System Schema

-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  current_uses INTEGER DEFAULT 0,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('free_month', 'discount_percent', 'credits')),
  reward_value DECIMAL(10, 2) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral uses tracking
CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  reward_granted_at TIMESTAMP WITH TIME ZONE,
  signup_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only use a referral code once
  UNIQUE(referral_code_id, referred_user_id)
);

-- Team workspace table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'professional', 'enterprise')),
  max_members INTEGER DEFAULT 5,
  style_guide JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invitation_email TEXT,
  invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'expired')),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only be in a team once
  UNIQUE(team_id, user_id)
);

-- Shared voice profiles for teams
CREATE TABLE IF NOT EXISTS team_voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  voice_profile_id UUID REFERENCES voiceprints(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a voice profile is shared to a team only once
  UNIQUE(team_id, voice_profile_id)
);

-- Pricing plans table
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('individual', 'team', 'student', 'educator')),
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  features JSONB NOT NULL DEFAULT '[]',
  limits JSONB NOT NULL DEFAULT '{}',
  discount_percent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES pricing_plans(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  referral_code_used UUID REFERENCES referral_codes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_uses_referred_user ON referral_uses(referred_user_id);
CREATE INDEX idx_referral_uses_referrer_user ON referral_uses(referrer_user_id);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_voice_profiles_team_id ON team_voice_profiles(team_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_team_id ON user_subscriptions(team_id);

-- RLS Policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Referral policies
CREATE POLICY "Users can view own referral codes" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referral codes" ON referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view referrals they're involved in" ON referral_uses
  FOR SELECT USING (auth.uid() = referred_user_id OR auth.uid() = referrer_user_id);

-- Team policies
CREATE POLICY "Team members can view their teams" ON teams
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.invitation_status = 'accepted'
    )
  );

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams" ON teams
  FOR UPDATE USING (auth.uid() = owner_id);

-- Team members policies
CREATE POLICY "Team members can view team membership" ON team_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.invitation_status = 'accepted'
    )
  );

-- Pricing plans are public
CREATE POLICY "Anyone can view active pricing plans" ON pricing_plans
  FOR SELECT USING (is_active = TRUE);

-- Subscription policies
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Default pricing plans
INSERT INTO pricing_plans (name, slug, type, price_monthly, price_yearly, features, limits) VALUES
('Free', 'free', 'individual', 0, 0, 
  '["5 analyses per month", "Basic voice profile", "Export to TXT"]',
  '{"analyses_per_month": 5, "voice_samples": 3}'
),
('Pro', 'pro', 'individual', 9.99, 99.99,
  '["Unlimited analyses", "Advanced voice profile", "All export formats", "Priority support"]',
  '{"analyses_per_month": -1, "voice_samples": -1}'
),
('Student', 'student', 'student', 4.99, 49.99,
  '["Unlimited analyses", "Advanced voice profile", "All export formats", "Academic tools"]',
  '{"analyses_per_month": -1, "voice_samples": -1}'
),
('Team Starter', 'team-starter', 'team', 49.99, 499.99,
  '["5 team members", "Shared voice profiles", "Team analytics", "Style guide"]',
  '{"analyses_per_month": -1, "team_members": 5}'
),
('Team Pro', 'team-pro', 'team', 149.99, 1499.99,
  '["Unlimited team members", "Advanced analytics", "API access", "Priority support"]',
  '{"analyses_per_month": -1, "team_members": -1}'
);