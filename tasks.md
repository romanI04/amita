# 🚀 amita.ai Sprint Implementation Tasks

## Overview
Critical improvements focused on **trust, conversion, and first-run experience** based on PM analysis.

### Key Problems Identified
- ❌ No working payment system (only TODO comments)
- ❌ Demo mode uses fake/static data instead of real AI
- ❌ Trust indicators (95% accuracy, 10k+ writers) are hardcoded lies
- ❌ No email verification resend flow despite error messages
- ❌ Voice profile creation blocks users unnecessarily
- ❌ No enforcement of free tier limits
- ❌ Poor mobile experience (375px overflow, small touch targets)

---

## Phase 1: Trust & Demo Reality (Priority: CRITICAL)
**Goal:** Remove fake data and build user trust with real AI capabilities

### Task 1: Real AI Demo Endpoint
- [ ] Create `/app/api/analyze/demo/route.ts` endpoint
- [ ] Integrate with xAI API for real analysis
- [ ] Add rate limiting (3 demos per IP per day)
- [ ] Store demo usage in memory/Redis
- [ ] Add "Powered by xAI" badge to results
- [ ] Include visible processing time
- [ ] Show "Demo X of 3 today" counter
- [ ] Return real detected sections and suggestions

### Task 2: Remove Static Demo Data
- [ ] Delete mock data from `/lib/examples.ts`
- [ ] Remove `exampleTexts` array completely
- [ ] Update `DemoMode.tsx` to call real API
- [ ] Remove pre-computed `aiConfidence` values
- [ ] Remove fake `detectedIssues` arrays
- [ ] Add loading states with real timing
- [ ] Show actual xAI processing

### Task 3: Fix Trust Indicators
- [ ] Query real user count from database
- [ ] Calculate average accuracy from last 100 analyses
- [ ] Remove hardcoded "95% accuracy" claim
- [ ] Remove fake "10k+ writers" if <1000 users
- [ ] Add "Last analysis: X seconds ago" ticker
- [ ] Show "X analyses today" counter
- [ ] Make metrics update every 30 seconds
- [ ] Add methodology link for accuracy claims

### Task 4: Request ID Visibility
- [ ] Generate unique request IDs for all API calls
- [ ] Add request ID to all error responses
- [ ] Display request ID in error banners
- [ ] Make request ID copyable with click
- [ ] Add "Contact support with this ID" link
- [ ] Include timestamp with request ID
- [ ] Store request IDs for debugging

---

## Phase 2: Payment Integration (Priority: HIGH)
**Goal:** Enable revenue generation with Stripe

### Task 5: Stripe Setup ✅
- [x] Install Stripe SDK (`npm install stripe @stripe/stripe-js`)
- [x] Add Stripe environment variables
- [x] Create Stripe products (Free, Pro, Student, Team)
- [x] Set up webhook endpoint
- [x] Configure test mode first

### Task 6: Payment API Routes ✅
- [x] Create `/app/api/checkout/route.ts`
- [x] Create `/app/api/webhook/stripe/route.ts`
- [x] Add session creation logic
- [x] Handle successful payment webhook
- [x] Update user subscription status
- [ ] Send confirmation emails (TODO: Phase 3)
- [x] Handle failed payments

### Task 7: Database Schema Updates ✅
- [x] Add `subscription_status` to profiles table
- [x] Add `subscription_tier` field (free/pro/student/team)
- [x] Add `trial_ends_at` timestamp
- [x] Add `stripe_customer_id` field
- [x] Add `stripe_subscription_id` field
- [x] Create subscriptions table for history
- [x] Add payment_methods table

### Task 8: Pricing Page Integration ✅
- [x] Replace TODO comment with real checkout
- [x] Add "Start 7-day trial" buttons
- [x] Show current plan if logged in
- [x] Add loading states during checkout
- [x] Handle redirect from Stripe
- [x] Show success/error messages
- [x] Add plan comparison table

### Task 9: Enforce Feature Limits ✅
- [x] Add analysis counter to user session
- [x] Block analysis after 5/month for free tier
- [x] Show "X/5 analyses used" counter
- [x] Add "Upgrade for unlimited" modal
- [x] Restrict voice profile to trial/paid users
- [x] Limit export formats (TXT only for free)
- [x] Add API rate limits by tier

---

## Phase 3: First-Run Excellence (Priority: HIGH)
**Goal:** Get users to value within 60 seconds

### Task 10: Welcome Page ✅
- [x] Create `/app/(dashboard)/welcome/page.tsx`
- [x] Redirect here after signup (not dashboard)
- [x] Pre-populate with sample text
- [x] Show pulsing "Try Analysis" button
- [x] Display "Your first 5 analyses are free" banner
- [x] Skip voice profile initially
- [x] Add progress bar for onboarding

### Task 11: Simplified Onboarding ✅
- [x] Reduce checklist to 2 items only
- [x] "Analyze your first text" (30 sec)
- [x] "View your results" (instant)
- [x] Add celebration animation on completion
- [x] Make "Earn Pro trial" optional 3rd task
- [x] Persist dismissal in localStorage
- [x] Show estimated time for each task

### Task 12: Progressive Voice Profile ✅
- [x] Remove from required onboarding
- [x] Show as dashboard upsell after 3 analyses
- [x] Position as "Pro feature"
- [x] Add progress indicator (0/3 samples)
- [x] Celebration moment with confetti on creation
- [x] Make benefits clear: "Voice-aware suggestions"

---

## Phase 4: Conversion Optimization (Priority: MEDIUM)
**Goal:** Increase free to paid conversion

### Task 13: Social Proof
- [ ] Add user count query to landing page

### Task 14: Urgency Messaging
- [ ] Add "Early bird pricing" banner
- [ ] Show "Price increasing to $29 next month"
- [ ] Display "Only 3 spots at this price"
- [ ] Add countdown timer for offers
- [ ] A/B test urgency messages
- [ ] Track conversion impact

### Task 15: Email Verification UX
- [ ] Add countdown timer (60 seconds)
- [ ] Auto-resend with notification
- [ ] Add "Check spam folder" reminder
- [ ] Show email preview "from: noreply@amita.ai"
- [ ] Allow email change from verify page
- [ ] Add "Continue with limited access" option
- [ ] Track verification completion rate

### Task 16: Magic Link Login
- [ ] Create `/app/api/auth/magic-link/route.ts`
- [ ] Generate secure time-limited tokens
- [ ] Send branded email template
- [ ] 15-minute expiration
- [ ] One-time use enforcement
- [ ] Auto-fill email for returning users
- [ ] Track usage vs password login

---

## Phase 5: Mobile & Performance (Priority: MEDIUM)
**Goal:** Expand addressable market and improve speed

### Task 17: Mobile Responsiveness
- [ ] Fix dashboard cards at 375px width
- [ ] Stack cards vertically on mobile
- [ ] Increase touch targets to 44px minimum
- [ ] Fix textarea resize on iOS Safari
- [ ] Add bottom navigation tabs
- [ ] Test on real devices
- [ ] Optimize font sizes for mobile

### Task 18: Performance Optimization
- [ ] Implement Redis caching
- [ ] Cache common analysis phrases
- [ ] Stream responses before completion
- [ ] Pre-warm xAI connection
- [ ] Cache voice profiles in memory
- [ ] Reduce time to <3 seconds P50
- [ ] Add performance monitoring

### Task 19: Error Improvements
- [ ] Replace technical errors with friendly messages
- [ ] "Authentication required" → "Please sign in to continue"
- [ ] "Rate limit exceeded" → "You're on fire! Wait 60 seconds"
- [ ] Add retry buttons to all errors
- [ ] Show countdown for rate limits
- [ ] Include suggested next actions
- [ ] Track error recovery rates

---

## Implementation Schedule

### Week 1 Focus
**Monday-Tuesday (Days 1-2)**
- Real demo mode (Tasks 1-2)
- Trust indicators (Task 3)
- Start Stripe setup (Task 5)

**Wednesday-Thursday (Days 3-4)**
- Payment integration (Tasks 6-8)
- Feature limits (Task 9)
- Welcome page (Task 10)

**Friday (Day 5)**
- Email verification (Task 15)
- Error improvements (Task 19)
- Testing & bug fixes

### Week 2 Focus
**Monday-Tuesday (Days 6-7)**
- Complete payment system
- Social proof (Task 13)
- Urgency messaging (Task 14)

**Wednesday-Thursday (Days 8-9)**
- Mobile responsive (Task 17)
- Performance optimization (Task 18)
- Progressive voice profile (Task 12)

**Friday (Day 10)**
- Magic link login (Task 16)
- Final testing
- Analytics verification

---

## Success Metrics

### Conversion Metrics
- [ ] Demo to signup: >20%
- [ ] Signup to first analysis: <60 seconds
- [ ] Free to trial conversion: >30%
- [ ] Trial to paid conversion: >10%

### Trust Metrics
- [ ] Email verification completion: >80%
- [ ] Error recovery rate: >50%
- [ ] Support tickets with request ID: 100%

### Performance Metrics
- [ ] Analysis response time P50: <3 seconds
- [ ] Mobile bounce rate: <40%
- [ ] Page load time: <2 seconds

---

## Database Migrations Needed

```sql
-- Add subscription fields to profiles
ALTER TABLE profiles ADD COLUMN subscription_status text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN subscription_tier text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN trial_ends_at timestamp;
ALTER TABLE profiles ADD COLUMN stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN stripe_subscription_id text;

-- Create subscriptions history table
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  stripe_subscription_id text,
  status text,
  tier text,
  amount integer,
  currency text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Add demo tracking
CREATE TABLE demo_usage (
  ip_address text PRIMARY KEY,
  usage_count integer DEFAULT 0,
  last_used timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
```

---

## Environment Variables Needed

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (optional for caching)
REDIS_URL=redis://localhost:6379

# Email (for magic links)
RESEND_API_KEY=re_...
```

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Stripe delays | Start with trial-only, add payment later |
| xAI rate limits | Cache demo texts, limit to 3/day/IP |
| Free tier abuse | Require email verification, track IPs |
| Mobile bugs | Progressive enhancement, test on real devices |
| Performance issues | Start with basic caching, optimize later |

---

## Notes

- **Priority Order**: Trust (demo reality) → Payments → Onboarding → Conversion → Polish
- **Quick Wins**: Real demo, trust indicators, request IDs can ship Day 1
- **Blockers**: Need Stripe account, Redis setup for caching
- **Testing**: Each task needs both unit and integration tests
- **Analytics**: Every user action needs telemetry events

---

## Current Status

✅ **Completed (January 18, 2025):**

**Phase 2: Payment Integration**
- Stripe SDK installed and configured
- Created Pro ($19), Student ($9), Team ($49) products with trials
- Payment API routes (`/api/checkout`, `/api/webhook/stripe`)
- Database schema updated with subscription fields
- Usage limits enforced (5 analyses/month for free tier)
- UsageTracker component on dashboard
- Real checkout flow on pricing page
- ngrok tunnel configured for webhook testing

**Phase 3: First-Run Excellence**
- Welcome page with pre-populated sample text
- Simplified onboarding to just 2 steps (30 seconds total)
- Progressive voice profile (shown after 3 analyses)
- Auto-redirect new users to welcome page
- Celebration moments and time estimates
- Optional skip to dashboard

🚧 **Next Up (Phase 1 - Trust & Demo Reality):**
- Task 1: Create real AI demo endpoint
- Task 2: Remove static demo data  
- Task 3: Fix trust indicators
- Task 4: Request ID visibility

📊 **Progress:** 8/19 major tasks complete (Phases 2 & 3 done!)