/**
 * amita.ai API Test Runner
 * 
 * Run this in browser console on amita.ai to test API endpoints
 * Requires being logged in to test authenticated endpoints
 */

(function() {
  'use strict';

  const API_BASE = window.location.origin;
  let testResults = { passed: 0, failed: 0, tests: [] };

  function log(message, type = 'info') {
    const styles = {
      info: 'color: #2563eb; font-weight: bold',
      success: 'color: #059669; font-weight: bold', 
      error: 'color: #dc2626; font-weight: bold',
      warning: 'color: #d97706; font-weight: bold'
    };
    console.log(`%c[API TEST] ${message}`, styles[type]);
  }

  function assert(condition, testName, description, responseTime = null) {
    const result = {
      name: testName,
      description: description,
      passed: !!condition,
      responseTime: responseTime,
      timestamp: new Date().toISOString()
    };
    
    testResults.tests.push(result);
    
    if (condition) {
      testResults.passed++;
      const timeStr = responseTime ? ` (${responseTime}ms)` : '';
      log(`✅ PASS: ${testName} - ${description}${timeStr}`, 'success');
    } else {
      testResults.failed++;
      log(`❌ FAIL: ${testName} - ${description}`, 'error');
    }
    
    return !!condition;
  }

  async function testEndpoint(url, options = {}, testName = '', expectedStatus = 200) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      const success = response.status === expectedStatus;
      assert(success, testName, `${url} returns status ${expectedStatus}`, responseTime);
      
      return { 
        success, 
        response, 
        responseTime,
        status: response.status,
        data: response.headers.get('content-type')?.includes('json') ? await response.json() : await response.text()
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      assert(false, testName, `${url} - Network Error: ${error.message}`, responseTime);
      return { success: false, error: error.message, responseTime };
    }
  }

  async function testAnalyzeAPI() {
    log('🔍 Testing Analyze API...', 'info');
    
    const testPayload = {
      text: "This is a test text for the analyze API. It should return analysis results including authenticity scores and AI detection confidence.",
      title: "Test Analysis",
      user_id: "test-user-id"
    };

    const result = await testEndpoint('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(testPayload)
    }, 'ANALYZE_API', 200);

    if (result.success && result.data) {
      // Test response structure
      const hasRequiredFields = result.data.ai_confidence_score !== undefined && 
                               result.data.authenticity_score !== undefined;
      assert(hasRequiredFields, 'ANALYZE_RESPONSE', 'Analyze API returns required fields');
      
      // Test no synthetic data
      const hasNoSynthetic = !JSON.stringify(result.data).toLowerCase().includes('mock') &&
                             !JSON.stringify(result.data).toLowerCase().includes('synthetic');
      assert(hasNoSynthetic, 'ANALYZE_NO_SYNTHETIC', 'Analyze API returns real data (no synthetic)');
    }
  }

  async function testRiskEstimateAPI() {
    log('📊 Testing Risk Estimate API...', 'info');
    
    const testPayload = {
      profileId: "test-profile-id",
      flaggedLineCount: 3,
      riskDrivers: {
        structure: { level: 'medium', score: 0.5 },
        repetition: { level: 'low', score: 0.3 }
      }
    };

    const result = await testEndpoint('/api/risk-estimate', {
      method: 'POST',
      body: JSON.stringify(testPayload)
    }, 'RISK_ESTIMATE_API', 200);

    if (result.success && result.data) {
      const hasRiskReduction = result.data.reduction !== undefined;
      assert(hasRiskReduction, 'RISK_ESTIMATE_RESPONSE', 'Risk estimate returns reduction value');
    }
  }

  async function testRewriteAPI() {
    log('✏️  Testing Rewrite API...', 'info');
    
    const testPayload = {
      text: "This text needs to be rewritten to reduce AI detection risk.",
      constraints: {
        locks: {
          sentenceLength: { enabled: true, tolerance: 10 },
          keepIdioms: true
        },
        domain: "General"
      },
      options: {
        strength: "balanced",
        preserveLocks: true
      }
    };

    const result = await testEndpoint('/api/rewrite', {
      method: 'POST',
      body: JSON.stringify(testPayload)
    }, 'REWRITE_API', 200);

    if (result.success && result.data) {
      const hasRewrittenText = result.data.rewritten && result.data.rewritten !== testPayload.text;
      assert(hasRewrittenText, 'REWRITE_RESPONSE', 'Rewrite API returns modified text');
    }
  }

  async function testApplySuggestionAPI() {
    log('💡 Testing Apply Suggestion API...', 'info');
    
    const testPayload = {
      text: "Original text that will be modified",
      suggestion: "Replace with this improved version",
      position: { start: 0, end: 25 },
      type: "clarity_improvement"
    };

    const result = await testEndpoint('/api/apply-suggestion', {
      method: 'POST',
      body: JSON.stringify(testPayload)
    }, 'APPLY_SUGGESTION_API', 200);

    if (result.success && result.data) {
      const hasAppliedText = result.data.modifiedText !== undefined;
      assert(hasAppliedText, 'APPLY_SUGGESTION_RESPONSE', 'Apply suggestion returns modified text');
    }
  }

  async function testVoiceprintAPI() {
    log('🎯 Testing Voiceprint APIs...', 'info');
    
    // Test voiceprint creation
    const createPayload = {
      user_id: "test-user-id", 
      samples: [
        { text: "Sample text 1", title: "Test 1" },
        { text: "Sample text 2", title: "Test 2" }
      ]
    };

    const createResult = await testEndpoint('/api/voiceprint/create', {
      method: 'POST',
      body: JSON.stringify(createPayload)
    }, 'VOICEPRINT_CREATE_API', 200);

    // Test voiceprint compute
    const computePayload = {
      voiceprint_id: "test-voiceprint-id",
      new_samples: ["Additional sample text for computation"]
    };

    const computeResult = await testEndpoint('/api/voiceprint/compute', {
      method: 'POST', 
      body: JSON.stringify(computePayload)
    }, 'VOICEPRINT_COMPUTE_API', 200);
  }

  async function testPerformanceBenchmarks() {
    log('⚡ Running Performance Benchmarks...', 'info');
    
    const benchmarkTests = [
      { name: 'ANALYZE_PERFORMANCE', url: '/api/analyze', threshold: 3000 },
      { name: 'REWRITE_PERFORMANCE', url: '/api/rewrite', threshold: 2000 },
      { name: 'RISK_ESTIMATE_PERFORMANCE', url: '/api/risk-estimate', threshold: 1000 }
    ];

    for (const test of benchmarkTests) {
      const result = await testEndpoint(test.url, {
        method: 'POST',
        body: JSON.stringify({ test: 'performance' })
      }, test.name, 400); // 400 expected for invalid payload

      // Even with error, we can check response time
      if (result.responseTime) {
        const withinThreshold = result.responseTime < test.threshold;
        assert(withinThreshold, `${test.name}_SPEED`, 
               `${test.url} responds in under ${test.threshold}ms`, result.responseTime);
      }
    }
  }

  async function runAllAPITests() {
    log('🚀 Starting API Tests...', 'info');
    
    try {
      await testAnalyzeAPI();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testRiskEstimateAPI();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testRewriteAPI();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testApplySuggestionAPI();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testVoiceprintAPI();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testPerformanceBenchmarks();
      
      // Results summary
      log(`\n🏁 API TEST RESULTS`, 'info');
      log(`✅ Passed: ${testResults.passed}`, 'success');
      log(`❌ Failed: ${testResults.failed}`, 'error');
      
      const avgResponseTime = testResults.tests
        .filter(t => t.responseTime)
        .reduce((sum, t) => sum + t.responseTime, 0) / 
        testResults.tests.filter(t => t.responseTime).length;
      
      log(`⚡ Avg Response Time: ${Math.round(avgResponseTime)}ms`, 'info');
      
      const successRate = (testResults.passed / testResults.tests.length * 100).toFixed(1);
      log(`📈 Success Rate: ${successRate}%`, successRate >= 70 ? 'success' : 'warning');
      
      // Store results globally
      window.__amitaAPITestResults = testResults;
      log('💾 API test results stored in window.__amitaAPITestResults', 'info');
      
    } catch (error) {
      log(`💥 API test runner error: ${error.message}`, 'error');
    }
  }

  // Export for manual testing
  window.__amitaAPITests = {
    runAll: runAllAPITests,
    testAnalyzeAPI,
    testRiskEstimateAPI,  
    testRewriteAPI,
    testApplySuggestionAPI,
    testVoiceprintAPI,
    testPerformanceBenchmarks,
    results: testResults
  };

  log('🔧 API Test Suite loaded. Run window.__amitaAPITests.runAll() to start testing.', 'info');
  
  // Auto-run API tests
  log('🚀 Auto-running API tests in 3 seconds...', 'info');
  setTimeout(runAllAPITests, 3000);

})();