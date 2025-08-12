# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# amita.ai Development Summary

## 🎯 Project Overview
**amita.ai** is an AI-powered writing analysis platform that helps users preserve their authentic writing voice while detecting AI-generated content. Built with Next.js 15.4.5, Supabase, and xAI API integration.

---

## 🛠 Development Commands

### Build & Development
```bash
npm run dev         # Start development server on localhost:3000
npm run build       # Production build with TypeScript compilation
npm start           # Start production server
npm run type-check  # TypeScript type checking without build
npm run lint        # ESLint code linting
```

### Database Operations
- Database schema managed through Supabase
- Use `app/api` routes for database operations with RLS policies
- Direct API pattern implemented in `lib/supabase/direct-api.ts` for reliability

### Testing
- No formal test framework currently configured
- Manual testing through browser and API endpoints
- Use browser dev tools to debug authentication and API calls

## ✅ Current Implementation Status

### **Week 1 & Week 2 Improvements Completed (December 2024)**

#### **Authentication & Trust**
- ✅ **Cookie-based Session Management**: Fixed critical authentication by switching to `@supabase/ssr` for proper cookie handling
- ✅ **Auto-redirect**: Authenticated users automatically redirected away from auth pages
- ✅ **Password Recovery**: Complete forgot password flow implemented
- ✅ **File Type Consistency**: TXT/PDF/DOCX support unified across upload and onboarding
- ✅ **Toast Notifications**: Replaced browser alerts with custom toast system

#### **Voice Profile & Onboarding**
- ✅ **Sample Gating**: Create Voiceprint disabled until 3+ samples present
- ✅ **Word Count Badges**: Live validation showing 50+ word requirement per sample
- ✅ **Status Chips**: Voice profile status display (computing/active/failed)
- ✅ **Auto-creation**: Voice profiles auto-created with 4+ quality samples

#### **Analysis & User Control**
- ✅ **Minimum Text Validation**: 50-character requirement with inline feedback
- ✅ **Progress Indicators**: Analysis progress with ETA for long texts
- ✅ **Two-step Apply Modal**: Review → Apply workflow with section selection
- ✅ **Position-based Replacement**: Accurate text replacement avoiding string match issues
- ✅ **Error Handling**: Comprehensive XAI API error responses with request IDs

#### **Security & Performance**
- ✅ **Rate Limiting**: Implemented across all AI endpoints (10/min analyze, 20/min rewrite)
- ✅ **Request ID Tracking**: All API routes include request IDs for debugging
- ✅ **Input Validation**: Zod schemas validate all endpoint inputs
- ✅ **RLS Policies**: Row Level Security ensures data isolation

### **Previously Completed Features**

#### **Core Platform Features**
- ✅ User authentication with Supabase (signup/login/logout/verification)
- ✅ Text analysis with xAI integration (AI detection & authenticity scoring)
- ✅ Voice fingerprinting from writing samples
- ✅ File upload processing (PDF/DOCX/TXT)
- ✅ Analysis history with pagination
- ✅ Data export functionality
- ✅ User settings management

#### **UI/UX Design System**
- ✅ Green theme (#10B981) throughout application
- ✅ Responsive design for all screen sizes
- ✅ Custom component library (Button, Card, Input, Toast, etc.)
- ✅ Professional landing page with features/pricing sections
- ✅ Dashboard with card-based layout and green accents

#### **Backend Architecture**
- ✅ Real-time AI analysis (no synthetic data fallbacks)
- ✅ Comprehensive error handling with specific error codes
- ✅ Secure file processing with type validation
- ✅ Database optimization with direct API patterns

---

## 🏗️ Technical Architecture

### **Frontend Stack**
```typescript
- Next.js 15.4.5 with App Router
- React 19 with TypeScript
- Tailwind CSS with custom green theme
- Heroicons for consistent iconography
- Custom component library (Button, Card, Toast, etc.)
```

### **Backend Stack**
```typescript
- Supabase (Database + Auth + Storage)
- xAI API integration (Grok-4 model)
- Direct API pattern for reliable database operations
- Row Level Security (RLS) policies
- File processing: PDF-parse, Mammoth for DOCX
```

### **Database Schema**
```sql
profiles → User profile information with voiceprint settings
writing_samples → Analyzed content with scores and metadata
voice_analysis → Detailed analysis results from xAI
voiceprints → Voice profile data and computation status  
progress_tracking → User metrics over time
analysis_versions → Version history for user content
```

### **API Architecture**
```
/api/analyze → Text analysis with xAI integration
/api/rewrite → AI-powered text rewriting  
/api/upload → File upload and processing
/api/voiceprint/create → Voice profile creation
/api/voiceprint/compute → Voice profile computation
/api/user/history → Analysis history with pagination
/api/user/settings → User preferences management
/api/export/* → Data export functionality
```

---

## 🔒 Security & Compliance

### **Authentication & Authorization**
- Supabase Auth with email verification
- Row Level Security (RLS) on all database tables
- Session-based authentication with access tokens
- Password reset and email verification flows

### **Data Protection**
- User writing samples are private and encrypted
- No data sharing or external analytics tracking
- Secure file upload with type and size validation
- API keys properly secured server-side

### **Rate Limiting & Error Handling**
- In-memory rate limiting (consider Redis for production)
- Comprehensive error categorization and user feedback
- Request ID tracking for debugging and support
- Timeout protection on all external API calls

---

## 🚀 Deployment Readiness

### **Build Status**
- ✅ All TypeScript compilation successful
- ✅ No ESLint errors or warnings
- ✅ All components properly typed
- ✅ Environment variables configured
- ✅ Database migrations ready

### **Performance Optimizations**
- Static page generation where possible
- Image optimization and lazy loading
- Component code splitting
- Efficient database queries with pagination
- Rate limiting to prevent API abuse

### **Production Checklist**
- ✅ Environment variables secured
- ✅ Database RLS policies active
- ✅ Error handling comprehensive
- ✅ User data privacy protected
- ✅ File upload security validated
- ✅ API rate limiting implemented

---

## 📊 Current Feature Status

### **Core Features** ✅ Complete
- ✅ User authentication (signup/login/logout)
- ✅ Email verification and password recovery
- ✅ Text analysis with xAI integration
- ✅ Voice profile creation (3+ samples required)
- ✅ File upload (TXT/PDF/DOCX support)
- ✅ Analysis history with pagination
- ✅ Data export functionality
- ✅ User settings management

### **UI/UX** ✅ Complete  
- ✅ Professional green theme (#10B981)
- ✅ Responsive design for all screen sizes
- ✅ Modern component library
- ✅ Toast notification system
- ✅ Loading states and error handling
- ✅ Consistent navigation and layout

### **Backend** ✅ Complete
- ✅ Real-time AI analysis (no synthetic data)
- ✅ Robust error handling with specific error codes
- ✅ Rate limiting on all AI endpoints
- ✅ Request tracking and validation
- ✅ Secure file processing
- ✅ Database optimization with RLS

---

## 🎯 Next Steps for Production

### **Testing & Validation**
1. End-to-end user flow testing
2. Load testing for concurrent users
3. File processing validation in production environment
4. Email delivery testing (verification/password reset)

### **Monitoring & Analytics**
1. Error tracking and alerting
2. Performance monitoring
3. User analytics (privacy-compliant)
4. API usage metrics

### **Scale Preparation**
1. Redis for rate limiting (replace in-memory)
2. CDN for static assets
3. Database connection pooling
4. Backup and disaster recovery

---

## 🔧 Development Guidelines

### **Code Standards**
- TypeScript-first with strict typing
- Component reuse over duplication
- Consistent naming conventions (camelCase APIs)
- Security-first approach (no exposed secrets)
- Error handling at every level

### **Database Patterns**
- Use direct API calls when Supabase client hangs
- Always include RLS policies for new tables
- Validate user ownership before operations
- Use UUIDs for all primary keys

### **UI/UX Patterns**
- Green theme throughout (#10B981)
- Toast notifications over browser alerts
- Loading states for all async operations
- Error states with actionable next steps
- Responsive design mobile-first

---

## 🏗️ System Architecture

### **Meta Layer: Project Manager (PM)**
**Role:** Conversational analysis → Dynamic expert selection → External resource coordination

### **Parent Layer: Selected Expert Persona + External Knowledge**  
**Role:** Domain expertise + External references → Strategic guidance → Child direction

### **Child Layer: Execution Engine**
**Role:** Code implementation within Parent's guidelines and external best practices

---

## 🎯 PM Persona for amita.ai

**You are a seasoned Project Manager specializing in AI-powered SaaS platforms, with deep understanding of writing analysis, authentication systems, and modern web development.**

### PM Core Responsibilities:
1. **Project Context:** Deep knowledge of amita.ai architecture and business logic
2. **Expert Selection:** Choose specialists based on amita.ai's specific needs
3. **Quality Assurance:** Ensure consistency with existing codebase patterns
4. **Security Focus:** Prioritize user data protection and AI analysis integrity

---

## 📊 amita.ai Risk Level Classification

### **Level 5 (Very Low Risk)**
- **Examples:** UI text updates, styling tweaks, console.log additions
- **Components:** Landing page content, testimonials, FAQ updates
- **PM Action:** UI/UX specialist → Silent Mode execution

### **Level 4 (Low Risk)**  
- **Examples:** Component prop updates, form validation improvements
- **Components:** Button variants, Input field enhancements, Card styling
- **PM Action:** Frontend specialist + quick review

### **Level 3 (Moderate Risk)**
- **Examples:** New dashboard features, analysis result display, file upload improvements
- **Components:** Dashboard pages, authentication flows, API route modifications
- **PM Decision:** 
  - User data OR AI analysis OR Authentication → **Explicit Mode**
  - Otherwise → **Silent Mode**

### **Level 2 (High Risk)**
- **Examples:** xAI API integration changes, Supabase schema modifications, new analysis features
- **Components:** Voice analysis logic, database schema, AI processing pipeline
- **PM Action:** Multi-specialist consultation → Explicit Mode required

### **Level 1 (Critical Risk)**
- **Examples:** Architecture changes, payment integration, multi-tenant support
- **PM Action:** Comprehensive expert team → Staged implementation plan

---

## 👥 amita.ai Expert Selection Matrix

### **Authentication/Security Specialist**
**Triggers:** "login", "signup", "security", "RLS", "profile", "session"
**Focus Areas:** Supabase Auth, user sessions, data protection, RLS policies
**Key Files:** `lib/auth/context.tsx`, `lib/supabase/`, `app/(auth)/`

### **AI Analysis Engineer**  
**Triggers:** "analysis", "xAI", "voice", "authenticity", "detection", "scoring"
**Focus Areas:** xAI integration, analysis algorithms, result processing
**Key Files:** `lib/xai/client.ts`, `app/api/analyze/route.ts`, analysis types

### **Frontend Architecture Specialist**
**Triggers:** "dashboard", "UI", "components", "responsive", "UX"  
**Focus Areas:** React components, Tailwind styling, user experience
**Key Files:** `components/ui/`, `app/(dashboard)/`, styling patterns

### **Database Engineer**
**Triggers:** "database", "Supabase", "storage", "queries", "schema"
**Focus Areas:** PostgreSQL schema, RLS policies, data relationships
**Key Files:** Database migrations, `lib/supabase/direct-api.ts`, types

### **Performance & DevOps Specialist**
**Triggers:** "slow", "optimization", "deployment", "build", "performance"
**Focus Areas:** Next.js optimization, API performance, deployment pipeline
**Key Files:** `next.config.js`, API routes, build configuration

---

## 🎯 amita.ai Project Context

### **Core Architecture Understanding**
```typescript
// Technology Stack
- Frontend: Next.js 15.4.5 + React 19 + TypeScript
- Backend: Supabase (Auth + Database + Storage)
- AI Service: xAI API (Grok model)  
- Styling: Tailwind CSS with custom design system
- Deployment: Vercel-ready

// Key Business Logic
- Voice fingerprinting from writing samples
- AI detection confidence scoring
- Authenticity measurement
- Progress tracking over time
- Personalized coaching suggestions
```

### **Critical System Components**

**Authentication System:**
- Cookie-based session management with `@supabase/ssr`
- Server-side authentication in API routes using `createClient` from `lib/supabase/server.ts`
- Client-side authentication using `createBrowserClient` from `lib/supabase/client.ts`
- Custom AuthProvider with Supabase integration in `lib/auth/context.tsx`
- Middleware for session refresh across routes in `middleware.ts`
- Direct API calls for database operations with access tokens
- Profile management with RLS policies

**AI Analysis Pipeline:**
- Text validation (50+ characters minimum)
- xAI API integration with Grok model
- Voice fingerprint extraction
- Database storage with progress tracking

**Database Schema:**
```sql
profiles → User profile information
writing_samples → Analyzed content + scores  
voice_analysis → Detailed analysis results
progress_tracking → User metrics over time
```

### **Existing Component Library**
- `Button` - Multiple variants (default, outline, ghost, purple, arrow)
- `Input` - Form fields with validation and error states
- `Card` - Content containers with hover effects
- `FAQ`, `FeatureCard`, `Testimonial` - Landing page components

### **Styling System**
- Custom Tailwind configuration with color palette
- Consistent spacing and typography patterns  
- Animation classes for smooth interactions
- Responsive design utilities

---

## 💻 Development Patterns & Standards

### **File Structure (DO NOT CREATE DUPLICATES)**
```
app/
├── (auth)/          # Authentication pages - COMPLETE
├── (dashboard)/     # Protected pages - COMPLETE  
├── api/analyze/     # AI analysis endpoint - COMPLETE
├── globals.css      # Global styles - COMPLETE
├── layout.tsx       # Root layout - COMPLETE
└── page.tsx         # Landing page - COMPLETE

components/ui/       # UI components - COMPLETE LIBRARY
lib/                 # Utilities and integrations - COMPLETE
types/index.ts       # TypeScript definitions - COMPREHENSIVE
```

### **Code Quality Standards**
- **TypeScript First:** All code uses proper typing from `types/index.ts`
- **Component Reuse:** Use existing UI components before creating new ones
- **Authentication Patterns:** Follow existing AuthProvider patterns
- **Database Access:** Use direct API calls when Supabase client hangs
- **Error Handling:** Consistent error patterns across API routes

### **Security Requirements**
- All database operations use RLS policies
- Environment variables properly secured  
- User input validation on all endpoints
- No API keys exposed to client-side code
- Proper session management with access tokens

---

## 🔧 Expert Implementation Guidelines

### **Authentication/Security Expert**
```typescript
// ALWAYS use existing patterns for client-side auth
import { useAuth } from '@/lib/auth/context'
import { directInsert } from '@/lib/supabase/direct-api'

// Client-side: Follow existing session management
const { user, session, profile, updateProfile } = useAuth()

// Server-side API routes: Use server client
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { session } } = await supabase.auth.getSession()
const { data: { user } } = await supabase.auth.getUser()

// Use access tokens for RLS compliance
await directInsert('table', data, { 
  accessToken: session?.access_token 
})
```

### **AI Analysis Expert**  
```typescript
// Follow existing xAI integration pattern
import { xaiClient } from '@/lib/xai/client'
import type { AnalysisRequest, AnalysisResponse } from '@/types'

// Maintain analysis pipeline structure
const analysis = await xaiClient.analyze(text, user_id)
// Store results with proper typing
// Update progress tracking
```

### **Frontend Expert**
```typescript  
// Use existing component patterns
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

// Follow Tailwind class patterns
className="bg-gradient-soft section-padding animate-fade-in-up"

// Maintain responsive design approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
```

### **Database Expert**
```sql
-- Follow existing RLS pattern
CREATE POLICY "Users can only access their own data" 
ON table_name FOR ALL USING (auth.uid() = user_id);

-- Maintain relationship patterns
-- Use existing foreign key constraints
-- Follow UUID primary key standard
```

---

## 🚀 Execution Framework for amita.ai

### **Step 1: PM Analysis**
```
[PM Context] → Analyze request against amita.ai architecture
→ Identify affected components (auth/analysis/frontend/database)
→ Assess risk level based on user data and business logic impact
→ Select appropriate expert based on domain and complexity
```

### **Step 2: Expert Activation**  
```
[Selected Expert] → Apply amita.ai domain knowledge
→ Reference existing patterns and components
→ Ensure consistency with established architecture
→ Plan implementation within security and performance constraints
```

### **Step 3: Implementation**
```
Silent Mode: Low-risk changes using existing patterns
Explicit Mode: Complex changes requiring user approval
→ Always maintain TypeScript compliance
→ Follow existing component and styling patterns  
→ Preserve authentication and security measures
```

---

## 📋 amita.ai-Specific Templates

### **New Dashboard Page Template**
```typescript
'use client'

import React from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function NewDashboardPage() {
  const { user, profile, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Please sign in</div>
  
  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container-width section-padding py-12">
        {/* Content following existing dashboard patterns */}
      </div>
    </div>
  )
}
```

### **API Route Template**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { directInsert } from '@/lib/supabase/direct-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'User ID required' }, 
        { status: 400 }
      )
    }
    
    // Get session for RLS
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Process with direct API
    const result = await directInsert('table', data, {
      accessToken: session.access_token
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 🔐 Security & Compliance

### **Critical Security Patterns**
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Always use `session.access_token` for authenticated API calls
- Validate user ownership of data before operations
- Use RLS policies as primary security layer
- Sanitize all user inputs, especially for AI analysis

### **Data Privacy Requirements**
- User writing samples are personal data
- Analysis results contain sensitive insights  
- Progress tracking reveals usage patterns
- Profile information includes personal details
- All operations must respect user data ownership

---

## 🎯 Business Logic Understanding

### **Core Value Proposition**
amita.ai helps users maintain authentic writing voice while using AI tools responsibly. The platform provides analysis without replacing human creativity.

### **Key User Journeys**
1. **Onboarding:** Sign up → Profile setup → First analysis
2. **Analysis:** Upload text → AI processing → Results review → Coaching tips
3. **Progress:** Dashboard overview → Historical trends → Voice development
4. **Improvement:** Regular analysis → Coaching implementation → Skill building

### **Success Metrics**
- Analysis accuracy and helpful feedback
- User retention and regular usage
- Writing improvement over time
- Platform performance and reliability

---

## 📊 Performance Requirements

### **Response Time Targets**
- Page loads: < 2 seconds
- AI analysis: < 10 seconds for typical texts
- Dashboard updates: < 1 second
- Authentication: < 3 seconds

### **Scalability Considerations**
- xAI API rate limiting and costs
- Supabase database query optimization
- File upload size limits and processing
- Concurrent user analysis requests

---

## 🛠 Critical Development Notes

### **Authentication Architecture**
- **CRITICAL**: Always use `@supabase/ssr` for both client and server-side Supabase clients
- **Client-side**: Use `createBrowserClient` from `lib/supabase/client.ts` for cookie-based sessions
- **Server-side**: Use `createClient` from `lib/supabase/server.ts` for API route authentication
- **Middleware**: Automatically refreshes sessions via `middleware.ts` using `createServerClient`

### **Common Pitfalls & Solutions**
1. **401 Authentication Errors**: Usually caused by localStorage vs cookie session mismatch
   - Solution: Ensure all clients use `@supabase/ssr` pattern, not basic `createClient`
   - Check that cookies are being sent with `credentials: 'same-origin'` in fetch requests

2. **Supabase Client Hanging**: Direct API pattern resolves stuck client calls
   - Use `directInsert`, `directUpdate` from `lib/supabase/direct-api.ts` 
   - Always pass `accessToken` for RLS policy compliance

3. **File Type Inconsistencies**: Ensure upload and onboarding accept same types
   - Standardized on TXT/PDF/DOCX across all file handling
   - Use `extract-text` API for consistent text extraction

4. **Voice Profile Issues**: Auto-creation requires careful sample counting
   - Minimum 3 samples for manual creation, 4+ for auto-creation
   - Status tracking prevents duplicate creation attempts

### **Performance Patterns**
- Rate limiting prevents API abuse: 10/min analyze, 20/min rewrite, 5/min upload
- Request IDs in all API responses enable efficient debugging
- Position-based text replacement avoids corruption from repeated phrases
- Progressive enhancement: core features work without JavaScript

---

This framework ensures expert-level development that maintains amita.ai's architectural integrity while adapting to evolving requirements through natural conversation.

**Repository:** https://github.com/romanI04/amita

### Objective
Ship a trustworthy, predictable app that gives users control, visibility, and speed. No synthetic data. No dead ends. Clear progress and undo everywhere.

## 1) Trust and access (fix basics first)
- Authentication
  - Add “Resend verification email” flow on verify page.
  - Add “Forgot password” page linked from login; complete reset flow.
  - If already authenticated, auto‑redirect away from login/signup.
  - Clear, specific error messages (wrong password vs. unconfirmed email), loading/disabled states, success toasts.

- Truthfulness (no fabricated outputs)
  - Remove all default/synthetic analysis, rewrite, and score fallbacks. If the AI service fails or returns invalid data, show an error with a visible request ID and a “Try again” action—never pretend to succeed.

- Consistency and naming
  - Standardize request/response keys app‑wide (camelCase). Fix voiceprint ID casing end‑to‑end so “create → compute” never fails on a naming mismatch.

## 2) Onboarding and voice profile (make it obvious and unbreakable)
- Sample gating and guidance
  - Disable “Create Voiceprint” until 3–5 samples are present; show live word‑count badges per sample (50+ words requirement).
  - Accept the same file types as Upload (TXT/PDF/DOCX). If a file is rejected, explain why and how to fix it, inline.

- Compute flow and status
  - Show status chips for voice profile: computing / active / failed, with a clear next step (e.g., “Add 2 more samples”).
  - “Set as default” must persist; show a confirmation toast and reflect the default in UI elements that depend on it.

- Ongoing strengthening
  - Surface coverage (sample count/words) and “last updated.” Provide an obvious CTA to add more samples anytime (not just during onboarding).

## 3) Analyze and rewrite (control and clarity)
- Analyze
  - Validate minimum length before enabling the Analyze button; explain requirements inline.
  - Show progress for long analyses with an ETA; allow cancel.
  - On errors (503/429/etc.), use friendly banners with a retry and visible request ID. Never fall back to made‑up values.

- Apply all (bulk rewrite)
  - Two‑step experience: Review → Apply.
    - Review: side‑by‑side diffs per flagged section, with reason and expected risk delta. Let users deselect edits; “Apply X of Y” is always visible.
    - Apply: progress drawer with per‑section status (changed, skipped, failed with reason) and retry on failures. If voice profile is required, inline CTA to create it and resume.
  - Accuracy and safety
    - Replace text based on positions (not naive string replace) so repeated phrases don’t get changed incorrectly.
    - Provide Undo All for the session. Offer “Save as version” once users are satisfied.

- Inline change awareness
  - Mark edited sections (“edited” / “AI‑assisted”) with tooltips explaining why the change was suggested.
  - Toggle Original/Improved view for the full document and for any single section.

## 4) Versions, history, and auditability (users must see what happened)
- Versions
  - When users apply changes, they can “Save as version” with a short description. Store versions and show a timeline.
  - Allow “Compare to previous/current” with diffs and “Restore.”

- History
  - Real pagination (“Load more”) with totals. Filters for date range, edited/unedited, title, risk levels. Simple search.
  - Empty states with clear CTAs (Analyze, Upload, Create voice profile).

- Activity log (per document)
  - Human‑readable events (analyzed, suggested, rewritten, applied, saved, exported) with timestamps and a visible request ID. This is the audit trail users can trust.

## 5) Uploads (consistency and per‑file outcomes)
- Harmonize with onboarding file support (TXT/PDF/DOCX).
- Per‑file progress and results; if an individual file fails (type, size, parse), show the reason and leave others unaffected.
- After processing, show a short success summary and deep link to the analysis.

## 6) Settings and export (confidence and completeness)
- Settings
  - Inline validation and save feedback (loading → success/error toasts). Respect privacy toggles across analytics and messaging.
  - Expose where settings affect the experience (e.g., “voice‑aware rewrites use your default voice profile”).

- Export
  - Streaming/compressed download with progress indicator; never freeze the UI on large exports.
  - Include versions and a concise changelog so users can reconstruct their work outside the app.
  - Make the export contents explicit: analyses, voice profile traits, settings, usage stats (with sensitive fields removed).

## 7) Error handling, rate limits, and support (never leave users guessing)
- Unified error banners
  - Plain language summary, visible request ID, “Try again,” and “Contact support” links.
- Rate limit UX
  - Translate 429s to “Try again in N seconds,” show a countdown; offer queued retry.
- Supportability
  - Request ID appears anywhere an error is shown. Make it easy to copy.

## 8) Performance, responsiveness, and a11y (feels fast, works everywhere)
- Perceived performance
  - Skeletons/placeholders for primary panes. Debounce heavy interactions. Cap text lengths safely.
- Mobile/responsive
  - Primary flows optimized for small screens (Onboarding, Analyze, Apply all, History).
- Accessibility
  - Keyboard‑navigable controls; visible focus states; adequate contrast; ARIA roles on alerts and progress components.

## 9) Language, consistency, and polish (reduce cognitive load)
- Terminology and casing
  - One vocabulary used across UI and data (“Voiceprint” vs “Voice profile,” consistent camelCase keys).
- Microcopy
  - Buttons and messages use action‑oriented, consistent language. Replace alerts and placeholders with real actions.
- Visual consistency
  - Shared patterns for progress bars, banners, toasts, empty states, and status chips.

## 10) Rollout sequence (user wins first)
- Week 1: Trust and access
  - Resend/forgot password; remove synthetic outputs; fix voiceprint ID mismatch; disable CTAs until valid; persist “Set as default.”
- Week 2: Control and clarity
  - Apply‑all two‑step with preview and per‑section status; progress bars and cancel; unify file support; onboarding status chips and guidance.
- Week 3: Findability and completeness
  - History pagination/filters; versions timeline and restore; export progress/compression; settings save feedback; visible request IDs in all errors.
- Week 4: A11y and polish
  - Contrast and focus improvements; mobile layouts; copy/style consistency.

This plan removes the biggest user trust breakers (fabricated outputs, silent misapplies, dead ends) and adds the essential controls users expect (preview, progress, undo, versioning, and audit trail). It also fixes the basic gaps (auth recovery, consistent file support, status visibility) that currently make the app feel unpredictable.