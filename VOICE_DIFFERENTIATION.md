# Voice-Aware Inline Editing: amita.ai Differentiation Strategy

## Executive Summary

amita.ai now offers **voice-preserving writing assistance** that shows the voice impact of every edit in real-time. Unlike Grammarly's generic grammar corrections, we help users maintain their authentic writing voice while improving their text.

---

## 🎯 Core Differentiation

### Grammarly
- Generic grammar and style corrections
- One-size-fits-all suggestions
- Focus on correctness over personality
- No awareness of individual voice

### amita.ai
- **Voice similarity scoring** for every suggestion
- **Voice-safe mode** filtering (70%+ similarity only)
- **Real-time voice calculations** without API calls
- **Preservation of authentic writing style**

---

## 🏗️ Technical Implementation

### 1. Real-Time Voice Calculator
**Location**: `/lib/voice/real-time-calculator.ts`

Calculates voice impact client-side in <100ms:
- Extracts stylometric metrics from text
- Compares against user's voice profile
- Returns similarity percentage (0-100%)
- Identifies affected voice dimensions

### 2. Voice Impact Indicators
**Location**: `/components/voice/VoiceImpactIndicator.tsx`

Visual representation using ASCII dots:
```
●●●●●●●●○○ 82% (Voice-safe)
●●●●●○○○○○ 45% (Risk)
```

### 3. Enhanced Suggestion Popup
Shows comprehensive voice analysis:
- Voice similarity percentage
- Preserved vs affected traits
- Trust badges with sample count
- ASCII dot visualization

### 4. Voice-Safe Mode Toggle
**Location**: `/components/voice/VoiceSafeToggle.tsx`

Premium feature that filters suggestions:
```
Voice-Safe Mode: [●● ON ○○ OFF]
Showing 7 of 12 suggestions (voice-safe only)
```

---

## 📊 Voice Similarity Algorithm

### Dimensions Analyzed
1. **Vocabulary** - Word choice sophistication
2. **Flow** - Rhythm and pacing
3. **Formality** - Professional vs casual
4. **Emotion** - Emotional expression
5. **Clarity** - Clear communication
6. **Originality** - Unique expression

### Calculation Process
```typescript
1. Extract metrics from original text
2. Extract metrics from suggested text
3. Compare dimension-by-dimension
4. Weight by importance
5. Aggregate to similarity score
```

### Thresholds
- **70-100%**: Voice-safe (green)
- **50-69%**: Caution (yellow)  
- **0-49%**: Risk (red)

---

## 🎨 Design System

### ASCII Dots Pattern
```
100%: ●●●●●●●●●●
 90%: ●●●●●●●●●○
 80%: ●●●●●●●●○○
 70%: ●●●●●●●○○○ (threshold)
 60%: ●●●●●●○○○○
 50%: ●●●●●○○○○○
<50%: ●●●●○○○○○○
```

### Typography
- **SF Mono**: Dots and metrics
- **Inter**: Body text
- **Gray-900**: Primary color
- **Minimal colors**: Subtle green/red for impact

### Components
- 1px gray borders
- No gradients or shadows
- Text over icons
- Whitespace for separation

---

## 💰 Paywall Strategy

### Free Tier (5 analyses/month)
- ✅ View all suggestions
- ✅ See voice impact scores
- ❌ Cannot apply suggestions
- ❌ No voice-safe mode
- ❌ No bulk apply

### Pro Tier ($19/month)
- ✅ Unlimited analyses
- ✅ Apply all suggestions
- ✅ Voice-safe mode
- ✅ Bulk voice-safe apply
- ✅ Activity history
- ✅ All export formats

---

## 📈 Conversion Drivers

### 1. Inline Voice Teasers (Free Users)
```
[Blurred] Voice Impact: ●●●●●○○○○○
[Lock] Create voice profile to unlock
```

### 2. Smart Upgrade Prompts
After 3rd analysis:
```
You've improved authenticity by 34% today!
●●●●●●○○○○ → ●●●●●●●●○○
[Go Pro for Voice-Safe Mode]
```

### 3. Value Display
```
This Month (Free Tier)
Analyses Used: ●●●○○ 3/5
AI Words Detected: 2,341
Authenticity Improved: +12%
```

---

## 🚀 Implementation Status

### ✅ Completed
- [x] Real-time voice calculator module
- [x] Voice impact indicators on suggestions  
- [x] Enhanced popup with voice similarity
- [x] Voice-Safe Mode toggle (premium)
- [x] Updated types for voice fields

### 🔄 In Progress
- [ ] Trust badges component
- [ ] Activity feed for changes
- [ ] Voice teasers for free users
- [ ] Smart upgrade prompts
- [ ] Mobile bottom sheet

### 📋 Pending
- [ ] API endpoint for voice calculations
- [ ] Voice comparison widget
- [ ] Gamification elements
- [ ] A/B testing framework

---

## 📊 Success Metrics

### Target KPIs
- **Suggestion application rate**: >30%
- **Voice similarity maintained**: >85%
- **Free → Pro conversion**: >5%
- **Mobile usage**: >40%
- **Session length increase**: +25%

### Tracking Events
```javascript
{
  event: 'suggestion_viewed',
  properties: {
    voice_similarity: number,
    has_voice_profile: boolean,
    is_premium: boolean
  }
}

{
  event: 'voice_safe_mode_toggled',
  properties: {
    enabled: boolean,
    filtered_count: number
  }
}
```

---

## 🔧 Developer Guide

### Adding Voice Calculations
```typescript
import { voiceCalculator } from '@/lib/voice/real-time-calculator'

const result = await voiceCalculator.calculateSimilarity(
  originalText,
  modifiedText,
  userProfile
)

// Display with dots
const dots = voiceCalculator.formatSimilarityDots(result.similarity)
```

### Using Voice Components
```tsx
import { VoiceImpactIndicator } from '@/components/voice/VoiceImpactIndicator'

<VoiceImpactIndicator 
  similarity={85} 
  size="sm" 
  showPercentage={true}
/>
```

### Voice-Safe Filtering
```typescript
const voiceSafeSuggestions = suggestions.filter(
  s => s.voiceSimilarity >= 70
)
```

---

## 🎯 Competitive Advantages

### vs Grammarly
1. **Personalization**: Every edit considers YOUR voice
2. **Transparency**: See exactly how edits affect authenticity  
3. **Control**: Choose only voice-safe edits
4. **Trust**: Based on your actual writing samples

### vs Other AI Detectors
1. **Proactive**: Fix issues before detection
2. **Educational**: Learn what makes writing authentic
3. **Preservative**: Maintain voice while improving
4. **Real-time**: Instant feedback without API calls

---

## 🚦 Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Performance on large texts | Chunk processing, cache results |
| User confusion | Onboarding tour, tooltips |
| Free tier too generous | A/B test limits, track conversion |
| Voice calculations inconsistent | Version lock algorithm, tests |

---

## 📅 Roadmap

### Phase 1: Foundation (Current)
- ✅ Voice calculator
- ✅ Inline indicators
- ✅ Enhanced popup
- ✅ Voice-safe mode

### Phase 2: Conversion (Next 2 weeks)
- Trust badges
- Activity feed
- Smart prompts
- Mobile experience

### Phase 3: Scale (Next month)
- API endpoint
- Batch processing
- Team features
- Analytics dashboard

---

## 🔗 Related Documentation

- [Revival Plan](./revival.md) - ASCII design system
- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [Types](./types/index.ts) - TypeScript definitions

---

*Last updated: December 2024*
*Version: 1.0.0*