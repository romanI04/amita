# amita.ai Comprehensive Test Plan

## ✅ Build & Compilation Status
- **TypeScript compilation**: ✅ PASSING
- **Next.js build**: ✅ PASSING (21 routes compiled successfully)
- **Major issues fixed**: Suspense boundary, TypeScript errors

---

## 🧪 Core Functionality Tests

### 1. Voice Profile System Tests

#### **Test 1.1: Voice Profile State Management**
**Location**: Navigate to `/profile` page
**Expected Behavior**:
- [ ] Page loads without errors
- [ ] Voice profile context initializes correctly
- [ ] State shows loading → data transition
- [ ] No console errors related to state management

**Test Steps**:
1. Open browser dev tools console
2. Navigate to `/profile` 
3. Check for VoiceProfile context logs
4. Verify state transitions: loading → loaded
5. Check Network tab for Supabase queries

**Analytics to Verify**: 
- System event: `system.voice_profile_loaded`
- Performance metric: `page_load_time_profile`

---

#### **Test 1.2: Voice Locks Functionality** 
**Location**: `/profile` page, Voice Locks section
**Expected Behavior**:
- [ ] Lock toggles work without page refresh
- [ ] Lock states persist in shared context
- [ ] Real-time notifications appear
- [ ] Analytics events fire on toggle

**Test Steps**:
1. Toggle each voice lock (sentence length, idioms, hedge frequency, punctuation)
2. Verify purple notification appears: "Rewrites now respect your updated locks"
3. Open dev tools → Network tab
4. Check for analytics events being sent
5. Verify context state updates immediately

**Analytics to Verify**:
- User action: `user.toggle_voice_lock`
- System event: `system.voice_profile_locked`

---

#### **Test 1.3: Domain Switching**
**Location**: `/profile` page, Domain tabs (General, Academic, Email, Creative)
**Expected Behavior**:
- [ ] Domain switches without page refresh
- [ ] Notification shows: "Switched to [Domain] domain. Analysis adapted"
- [ ] Voice profile version increments
- [ ] Analytics logged correctly

**Test Steps**:
1. Switch between domain tabs
2. Verify purple notification appears for each switch
3. Check console for domain change events
4. Verify analytics in Network tab

**Analytics to Verify**:
- User action: `user.switch_domain` 
- System event: `system.voice_profile_domain_switched`

---

### 2. Analysis + Voice Profile Integration Tests

#### **Test 2.1: Text Analysis with Voice Profile Integration**
**Location**: Navigate to `/analyze` page
**Expected Behavior**:
- [ ] Text analysis triggers voice profile updates
- [ ] Sample automatically added to voice profile
- [ ] Cross-page event notifications work
- [ ] Real-time coverage updates

**Test Steps**:
1. Go to `/analyze` page
2. Enter test text (minimum 50 characters):
   ```
   This is a sample text for testing the analysis functionality of amita.ai. The system should detect patterns and provide authenticity scores while updating the voice profile automatically with this new writing sample.
   ```
3. Click "Analyze Text"
4. Verify analysis completes successfully
5. Check for purple notification about sample being added to voice profile
6. Navigate to `/profile` page
7. Verify sample count increased in overview section

**Analytics to Verify**:
- System event: `system.analysis_started`
- System event: `system.analysis_completed` 
- User action: `user.upload_sample`
- Business metric: `business.analysis_completed`
- Business metric: `business.sample_uploaded`

---

#### **Test 2.2: Cross-Page Event Communication**
**Location**: Open `/analyze` and `/profile` in separate browser tabs
**Expected Behavior**:
- [ ] Events from analyze page trigger updates in profile page
- [ ] Real-time notifications appear in both pages
- [ ] Voice profile data stays synchronized

**Test Steps**:
1. Open `/analyze` in tab 1
2. Open `/profile` in tab 2
3. In tab 1: Run an analysis
4. In tab 2: Watch for real-time notification about new sample
5. Switch voice lock in tab 2
6. In tab 1: Verify notification about constraint update

**Analytics to Verify**:
- Event bus communications working
- Real-time UI updates
- Context synchronization across tabs

---

### 3. Voice-Aware Rewriting Tests

#### **Test 3.1: Voice-Aware Black Button Actions**
**Location**: `/analyze` page after running analysis
**Expected Behavior**:
- [ ] "Fix flagged lines" button appears if profile exists
- [ ] Button shows expected risk reduction estimate
- [ ] Rewrite respects voice profile constraints
- [ ] Analytics track rewrite application

**Test Steps**:
1. Complete an analysis that flags some sections
2. Verify voice-aware action buttons appear
3. Click "Fix all flagged lines"
4. Verify rewritten text appears
5. Check that rewrite maintains voice characteristics
6. Verify purple success notification appears

**Analytics to Verify**:
- User action: `user.apply_rewrite`
- System event: `system.analysis_rewritten`
- Business metric: `business.rewrite_applied`
- Performance: API call duration for rewrite

---

#### **Test 3.2: Individual Section Rewriting**
**Location**: Flagged sections in analysis results
**Expected Behavior**:
- [ ] Individual "Rewrite" buttons work
- [ ] Each rewrite respects voice profile constraints
- [ ] Real-time UI updates after rewrite

**Test Steps**:
1. After analysis, find flagged sections
2. Click individual "Rewrite" buttons
3. Verify each section gets rewritten appropriately
4. Check for constraint compliance

---

### 4. Analytics & Database Integration Tests

#### **Test 4.1: Analytics Event Logging**
**Location**: Browser dev tools → Network tab
**Expected Behavior**:
- [ ] Analytics events batch correctly (every 30 seconds)
- [ ] Critical events (errors) flush immediately
- [ ] Database receives events properly
- [ ] RLS policies work correctly

**Test Steps**:
1. Open Network tab in dev tools
2. Perform various user actions (analyze, toggle locks, switch domains)
3. Wait 30+ seconds
4. Look for POST requests to analytics endpoint
5. Verify event batching and proper structure

**Expected Network Calls**:
- `POST /api/analytics` or similar
- Supabase insert operations
- Proper authentication headers

---

#### **Test 4.2: Performance Monitoring**
**Location**: Browser dev tools → Console and Performance tabs  
**Expected Behavior**:
- [ ] API response times logged
- [ ] Memory usage tracked
- [ ] Component render times measured
- [ ] Error events captured

**Test Steps**:
1. Open Performance tab in dev tools
2. Start recording performance
3. Navigate between pages and perform actions
4. Check console for performance metrics
5. Look for memory usage logs
6. Verify API performance tracking

**Expected Console Logs**:
- API performance metrics
- Memory usage measurements
- Component render timings

---

### 5. Error Handling & Edge Cases

#### **Test 5.1: Network Error Handling**
**Location**: Any page with API calls
**Expected Behavior**:
- [ ] Network failures show proper error messages
- [ ] No synthetic/mock data fallbacks
- [ ] Error states logged to analytics
- [ ] User-friendly error messages

**Test Steps**:
1. Open dev tools → Network tab
2. Set network to "Offline" 
3. Try to perform analysis
4. Verify proper error handling
5. Check that no synthetic data appears
6. Verify error analytics are logged

---

#### **Test 5.2: Authentication Edge Cases**
**Location**: All protected pages
**Expected Behavior**:
- [ ] Unauthenticated users redirected properly
- [ ] Session expiration handled gracefully
- [ ] Auth context working correctly

**Test Steps**:
1. Clear all browser storage/cookies
2. Try to access `/profile` and `/analyze` directly
3. Verify redirect to login page
4. Test session restoration after login

---

## 📊 Success Criteria Summary

### ✅ **CRITICAL** - Must Pass
- [ ] Build compiles without errors
- [ ] Voice profile state management works
- [ ] Analysis + profile integration functional  
- [ ] No synthetic/mock data present
- [ ] Basic navigation works
- [ ] Authentication flow works

### 📈 **IMPORTANT** - Should Pass  
- [ ] Voice-aware rewriting works
- [ ] Real-time events between pages work
- [ ] Analytics logging functional
- [ ] Error handling graceful
- [ ] Performance within reasonable bounds

### 🎯 **NICE TO HAVE** - May Pass
- [ ] Complex cross-page synchronization
- [ ] Advanced analytics dashboards
- [ ] Performance optimizations
- [ ] Edge case handling

---

## 🚀 Quick Test Commands

### Start Development Server
```bash
npm run dev
```

### Test in Browser Console
```javascript
// Check Voice Profile Context
window.__VOICE_PROFILE_STATE__ = true;

// Trigger analytics flush
if (window.analyticsLogger) {
  window.analyticsLogger.flushEvents();
}

// Check for event bus
if (window.voiceProfileEventBus) {
  console.log('Event bus available:', window.voiceProfileEventBus);
}
```

### Database Check (if Supabase access available)
1. Check `analytics_events` table for recent events
2. Verify `voice_profiles` table data integrity
3. Test RLS policies working correctly

---

## 📝 Test Report Template

```
## Test Execution Report - [Date]

### Environment
- Browser: [Chrome/Firefox/Safari]
- Environment: [Development/Production]
- User: [Test user email]

### Results
**Core Functionality**: ✅/❌
**Voice Profile Integration**: ✅/❌  
**Analytics Logging**: ✅/❌
**Error Handling**: ✅/❌

### Issues Found
1. [Description of issue]
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs actual behavior

### Performance Notes
- Page load times: [X]ms average
- API response times: [X]ms average
- Memory usage: Within/Above normal bounds

### Recommendations
- [Any recommendations for fixes or improvements]
```

---

This comprehensive test plan covers all major functionality we've implemented. You can run these tests either manually through the browser or create automated tests using this framework!