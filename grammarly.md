
    🎯 Core Differentiation: Voice Preservation vs Grammar 
    Correction

    Vision

    Transform amita.ai from an AI detector into a 
    voice-preserving writing assistant that shows the voice 
    impact of every edit in real-time, using our signature ASCII 
    dot aesthetic.

    Design System Preservation

    - ASCII Dots: ●●●●●○○○○○ for voice similarity scores
    - SF Mono for all metrics and dots
    - Inter for body text
    - Minimal colors: Gray-900 primary, subtle green/red for 
    impact
    - 1px gray borders, no gradients or shadows
    - Text over icons everywhere

    Phase 1: Voice-Aware Inline Editing (Days 1-3)

    1.1 Real-Time Voice Calculator 
    (/lib/voice/real-time-calculator.ts)

    Purpose: Calculate voice impact client-side without API calls

    // Core functionality:
    - Extract voice dimensions from existing profile
    - Calculate similarity score for any text change
    - Cache calculations for performance
    - Return scores in <100ms

    Key Features:
    - Voice similarity percentage (0-100%)
    - Dimension-specific impact (which traits affected)
    - Risk delta calculation
    - Cached profile metrics

    1.2 Enhanced Inline Suggestions 
    (/app/(dashboard)/analyze/page.tsx)

    Visual Changes:
    Current: Simple underlines with colored borders
    New: Underlines with voice impact indicators

    Example rendering:
    "This text needs improvement" [regular underline]
                                  ↓
    "This text needs improvement" [underline + ●●●●●○○○○○ 52% 
    voice match]

    Popup Enhancement:
    ┌─────────────────────────────────┐
    │ AI Pattern Detected             │
    │ ································ │ (ASCII separator)
    │                                 │
    │ Voice Impact: ●●●●●●●○○○ 72%   │ (ASCII dots)
    │ Preserves: Casual tone ✓        │
    │ Changes: Formality ↓            │
    │                                 │
    │ Original:                       │
    │ "got" (your style)              │
    │                                 │
    │ Suggested:                      │
    │ "received" (more formal)        │
    │                                 │
    │ [Apply] [Dismiss]               │
    └─────────────────────────────┘

    1.3 Voice-Safe Mode Toggle

    Location: Top of analyze page, next to word count

    Voice-Safe Mode: [●● ON ○○ OFF]
    Only shows edits that maintain >70% voice similarity

    Implementation:
    - Filter suggestions by voice similarity threshold
    - Show count: "Showing 7 of 12 suggestions (voice-safe only)"
    - Premium-only feature with blur for free users

    Phase 2: Trust & Transparency (Days 4-5)

    2.1 Voice Comparison Widget

    For each suggestion, show:
    Before: ●●●●●●●●○○ 82% authentic
    After:  ●●●●●●○○○○ 64% authentic
    Delta:  ↓18% voice drift

    2.2 Trust Badges

    Add to each suggestion:
    [Based on your 47 samples] [92% confidence]

    2.3 Activity Feed Component 
    (/components/history/ActivityFeed.tsx)

    Collapsible panel showing:
    ••••••••• Activity Log •••••••••

    12:34pm Changed "got" → "received" 
            Voice: 92% → 88% (↓4%)
            
    12:33pm Applied 7 voice-safe fixes
            Overall: 76% → 84% (↑8%)
            
    [Export Log] [Clear]

    Phase 3: Conversion Drivers (Days 6-7)

    3.1 Inline Voice Teasers (Free Users)

    Show grayed-out voice scores:
    [Blurred] Voice Impact: ●●●●●○○○○○
    [Lock icon] Create voice profile to see impact

    3.2 Smart Upgrade Prompts

    Contextual CTAs:
    After 3rd analysis:
    ┌────────────────────────────────┐
    │ You've improved authenticity   │
    │ by 34% today!                  │
    │                                │
    │ ●●●●●●○○○○ → ●●●●●●●●○○       │
    │                                │
    │ [Go Pro for Voice-Safe Mode]   │
    └────────────────────────────────┘

    3.3 Free Tier Value Display

    Dashboard widget:
    This Month (Free Tier)
    ••••••••••••••••••••••
    Analyses Used: ●●●○○ 3/5
    AI Words Detected: 2,341
    Authenticity Improved: +12%

    [Upgrade for Unlimited]

    Phase 4: Mobile Experience (Days 8-9)

    4.1 Bottom Sheet for Mobile

    Replace popups with slide-up sheets:
    [Swipe up gesture indicator]
    ─────────────────────────
    Voice Impact
    ●●●●●●●○○○ 73% match

    [Swipe right → Apply]
    [Swipe left ← Dismiss]

    4.2 Touch Optimizations

    - 44px minimum touch targets
    - Sticky apply button at bottom
    - Collapsible panels for space

    Technical Implementation

    Database Schema Updates

    -- Add to AIDetectedSection type
    voice_similarity FLOAT,
    voice_dimensions_affected JSONB,
    application_count INTEGER DEFAULT 0,
    dismissed BOOLEAN DEFAULT false

    API Endpoints

    /api/voice/calculate - Calculate voice impact
    /api/voice/apply-suggestion - Track applied changes
    /api/activity/log - Store activity history

    Component Structure

    components/
    ├── voice/
    │   ├── VoiceImpactIndicator.tsx (dots display)
    │   ├── VoiceSafeToggle.tsx (premium toggle)
    │   └── VoiceCalculator.tsx (real-time calc)
    ├── suggestions/
    │   ├── InlineSuggestion.tsx (enhanced popup)
    │   ├── SuggestionFilter.tsx (voice-safe filter)
    │   └── TrustBadges.tsx (confidence display)
    └── history/
        └── ActivityFeed.tsx (change log)

    State Management

    // Add to existing contexts
    interface VoiceEditingState {
      voiceSafeMode: boolean
      similarityThreshold: number
      appliedChanges: ChangeLog[]
      voiceCalculations: Map<string, number>
    }

    Paywall Implementation

    Free Tier (5 analyses/month)

    - View all suggestions ✓
    - See basic AI detection ✓
    - Export as TXT only ✓
    - Voice impact scores (view only) ✓
    - Cannot apply suggestions ✗
    - No voice-safe mode ✗
    - No bulk apply ✗

    Pro Tier ($19/month)

    - Unlimited analyses ✓
    - Apply all suggestions ✓
    - Voice-safe mode ✓
    - Bulk voice-safe apply ✓
    - All export formats ✓
    - Activity history ✓
    - API access ✓

    Success Metrics

    - Suggestion application rate: >30%
    - Voice similarity maintained: >85%
    - Free → Pro conversion: >5%
    - Mobile usage: >40%
    - User session length: +25%

    ASCII Dot Patterns

    Voice Similarity:
    100%: ●●●●●●●●●●
     90%: ●●●●●●●●●○
     80%: ●●●●●●●●○○
     70%: ●●●●●●●○○○ (threshold)
     60%: ●●●●●●○○○○
     50%: ●●●●●○○○○○
    <50%: ●●●●○○○○○○ (warning)

    Risk Mitigations

    - Performance: Cache voice calculations, progressive loading
    - Confusion: Onboarding tour, tooltips, help videos
    - Mobile gestures: Fallback buttons, touch-action CSS
    - Free tier balance: A/B test limits, track conversions

    Implementation Priority

    1. Critical: Voice calculator, inline indicators, voice-safe 
    mode
    2. Important: Trust badges, activity feed, mobile experience
    3. Nice-to-have: Gamification, achievements, challenges

    This plan creates a clear differentiation from Grammarly by 
    making every editing decision voice-aware, using our 
    signature ASCII aesthetic throughout.