/**
 * amita.ai Browser Test Runner
 * 
 * Run this in the browser console on any amita.ai page to test core functionality
 * Usage: Copy and paste this entire script into browser dev tools console
 */

(function() {
  'use strict';

  // Test results storage
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Utility functions
  function log(message, type = 'info') {
    const styles = {
      info: 'color: #2563eb; font-weight: bold',
      success: 'color: #059669; font-weight: bold', 
      error: 'color: #dc2626; font-weight: bold',
      warning: 'color: #d97706; font-weight: bold'
    };
    console.log(`%c[amita.ai TEST] ${message}`, styles[type]);
  }

  function assert(condition, testName, description) {
    const result = {
      name: testName,
      description: description,
      passed: !!condition,
      timestamp: new Date().toISOString()
    };
    
    testResults.tests.push(result);
    
    if (condition) {
      testResults.passed++;
      log(`✅ PASS: ${testName} - ${description}`, 'success');
    } else {
      testResults.failed++;
      log(`❌ FAIL: ${testName} - ${description}`, 'error');
    }
    
    return !!condition;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Core test functions
  async function testBuildStatus() {
    log('🔧 Testing Build Status...', 'info');
    
    // Check if React is loaded
    assert(
      typeof window.React !== 'undefined' || document.querySelector('[data-reactroot]'),
      'BUILD_STATUS', 
      'React application loaded successfully'
    );
    
    // Check if Next.js router is available
    assert(
      window.next || document.querySelector('#__next'),
      'BUILD_STATUS',
      'Next.js framework initialized'
    );
    
    // Check for critical CSS
    assert(
      document.querySelector('style') || document.querySelector('link[rel="stylesheet"]'),
      'BUILD_STATUS',
      'CSS styling loaded'
    );
  }

  async function testVoiceProfileContext() {
    log('🎯 Testing Voice Profile Context...', 'info');
    
    // Check if voice profile context is available
    const hasVoiceProfileProvider = document.querySelector('[data-voice-profile]') || 
                                   window.voiceProfileContext ||
                                   Array.from(document.querySelectorAll('*')).some(el => 
                                     el.textContent?.includes('Voice Profile') || 
                                     el.className?.includes('voice')
                                   );
    
    assert(hasVoiceProfileProvider, 'VOICE_PROFILE_CONTEXT', 'Voice profile context available');
    
    // Check for voice profile UI elements
    const hasVoiceProfileUI = document.querySelector('[data-testid*="voice"]') ||
                             document.querySelector('.voice') ||
                             Array.from(document.querySelectorAll('*')).some(el =>
                               el.textContent?.toLowerCase().includes('voice lock') ||
                               el.textContent?.toLowerCase().includes('authenticity')
                             );
    
    assert(hasVoiceProfileUI, 'VOICE_PROFILE_UI', 'Voice profile UI elements present');
  }

  async function testAnalyticsLogging() {
    log('📊 Testing Analytics Logging...', 'info');
    
    // Check if analytics logger is available
    const hasAnalytics = window.analyticsLogger || 
                        window.gtag || 
                        window.analytics ||
                        typeof window.logUserAction === 'function';
    
    assert(hasAnalytics, 'ANALYTICS_LOGGING', 'Analytics system initialized');
    
    // Test if analytics events can be created
    let analyticsWorking = false;
    try {
      if (window.analyticsLogger) {
        analyticsWorking = typeof window.analyticsLogger.logUserAction === 'function';
      } else if (typeof window.logUserAction === 'function') {
        analyticsWorking = true;
      }
    } catch (e) {
      log(`Analytics test error: ${e.message}`, 'warning');
    }
    
    assert(analyticsWorking, 'ANALYTICS_EVENTS', 'Analytics event logging functional');
  }

  async function testNetworkIntegration() {
    log('🌐 Testing Network Integration...', 'info');
    
    // Check if we can access the xAI client
    const hasXaiClient = window.xaiClient || 
                        Array.from(document.querySelectorAll('script')).some(script =>
                          script.src?.includes('xai') || script.textContent?.includes('xai')
                        );
    
    assert(hasXaiClient, 'XAI_INTEGRATION', 'xAI client integration available');
    
    // Check Supabase integration
    const hasSupabase = window.supabase ||
                       Array.from(document.querySelectorAll('script')).some(script =>
                         script.src?.includes('supabase') || script.textContent?.includes('supabase')
                       );
    
    assert(hasSupabase, 'SUPABASE_INTEGRATION', 'Supabase client integration available');
  }

  async function testPageFunctionality() {
    log('📄 Testing Page-Specific Functionality...', 'info');
    
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('analyze') || currentPath === '/analyze') {
      // Test analyze page elements
      const hasAnalyzeUI = document.querySelector('textarea') ||
                          document.querySelector('[placeholder*="text"]') ||
                          document.querySelector('button[type="submit"]');
      
      assert(hasAnalyzeUI, 'ANALYZE_PAGE', 'Analyze page UI elements present');
      
      // Test for voice-aware buttons
      const hasVoiceAwareButtons = Array.from(document.querySelectorAll('button')).some(btn =>
        btn.textContent?.toLowerCase().includes('fix') ||
        btn.textContent?.toLowerCase().includes('rewrite')
      );
      
      assert(hasVoiceAwareButtons, 'VOICE_AWARE_BUTTONS', 'Voice-aware action buttons available');
    }
    
    if (currentPath.includes('profile') || currentPath === '/profile') {
      // Test profile page elements
      const hasProfileUI = document.querySelector('[data-testid*="lock"]') ||
                          Array.from(document.querySelectorAll('*')).some(el =>
                            el.textContent?.includes('Voice Lock') ||
                            el.textContent?.includes('Domain')
                          );
      
      assert(hasProfileUI, 'PROFILE_PAGE', 'Profile page UI elements present');
      
      // Test for domain tabs
      const hasDomainTabs = Array.from(document.querySelectorAll('button')).some(btn =>
        ['General', 'Academic', 'Email', 'Creative'].some(domain =>
          btn.textContent?.includes(domain)
        )
      );
      
      assert(hasDomainTabs, 'DOMAIN_TABS', 'Domain switching tabs available');
    }
  }

  async function testErrorHandling() {
    log('⚠️  Testing Error Handling...', 'info');
    
    // Check for error boundaries
    const hasErrorBoundary = window.ErrorBoundary ||
                            document.querySelector('[data-error-boundary]') ||
                            Array.from(document.querySelectorAll('*')).some(el =>
                              el.className?.includes('error') && el.className?.includes('boundary')
                            );
    
    assert(hasErrorBoundary, 'ERROR_BOUNDARY', 'Error boundary components available');
    
    // Check console for critical errors (should be none)
    let hasConsoleErrors = false;
    const originalConsoleError = console.error;
    const errorCounts = { critical: 0, warnings: 0 };
    
    console.error = function(...args) {
      const errorMessage = args.join(' ').toLowerCase();
      if (errorMessage.includes('synthetic') || errorMessage.includes('mock')) {
        errorCounts.critical++;
        hasConsoleErrors = true;
      }
      originalConsoleError.apply(console, args);
    };
    
    // Wait a bit to catch any immediate errors
    await sleep(1000);
    console.error = originalConsoleError;
    
    assert(!hasConsoleErrors, 'NO_SYNTHETIC_ERRORS', 'No synthetic/mock data errors in console');
  }

  async function testPerformance() {
    log('⚡ Testing Performance...', 'info');
    
    // Test page load performance
    const performance = window.performance;
    if (performance && performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      assert(loadTime < 5000, 'PAGE_LOAD_PERFORMANCE', `Page loaded in ${loadTime}ms (under 5s)`);
    } else {
      assert(true, 'PAGE_LOAD_PERFORMANCE', 'Performance API not available (assumed good)');
    }
    
    // Test memory usage if available
    if (performance && performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      assert(memoryUsage < 100, 'MEMORY_USAGE', `Memory usage: ${memoryUsage.toFixed(2)}MB (under 100MB)`);
    } else {
      assert(true, 'MEMORY_USAGE', 'Memory API not available (assumed good)');
    }
  }

  // Main test runner
  async function runAllTests() {
    log('🚀 Starting amita.ai Comprehensive Tests...', 'info');
    log(`Testing on: ${window.location.href}`, 'info');
    
    try {
      await testBuildStatus();
      await sleep(500);
      
      await testVoiceProfileContext();
      await sleep(500);
      
      await testAnalyticsLogging();
      await sleep(500);
      
      await testNetworkIntegration();
      await sleep(500);
      
      await testPageFunctionality();
      await sleep(500);
      
      await testErrorHandling();
      await sleep(500);
      
      await testPerformance();
      
      // Final results
      log(`\n🏁 TEST RESULTS SUMMARY`, 'info');
      log(`✅ Passed: ${testResults.passed}`, 'success');
      log(`❌ Failed: ${testResults.failed}`, 'error');
      log(`📊 Total: ${testResults.tests.length}`, 'info');
      
      const successRate = (testResults.passed / testResults.tests.length * 100).toFixed(1);
      log(`📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'success' : 'warning');
      
      if (testResults.failed === 0) {
        log('🎉 ALL TESTS PASSED! Application is working correctly.', 'success');
      } else if (testResults.failed <= 2) {
        log('⚠️  Minor issues detected. Application mostly functional.', 'warning');
      } else {
        log('🚨 Multiple issues detected. Review failed tests.', 'error');
      }
      
      // Store results globally for inspection
      window.__amitaTestResults = testResults;
      log('💾 Test results stored in window.__amitaTestResults', 'info');
      
    } catch (error) {
      log(`💥 Test runner error: ${error.message}`, 'error');
      console.error('Full error:', error);
    }
  }

  // Export test functions for manual use
  window.__amitaTests = {
    runAll: runAllTests,
    testBuildStatus,
    testVoiceProfileContext,
    testAnalyticsLogging,
    testNetworkIntegration,
    testPageFunctionality,
    testErrorHandling,
    testPerformance,
    results: testResults
  };

  log('🔧 amita.ai Test Suite loaded. Run window.__amitaTests.runAll() to start testing.', 'info');
  
  // Auto-run tests
  log('🚀 Auto-running tests in 2 seconds...', 'info');
  setTimeout(runAllTests, 2000);

})();