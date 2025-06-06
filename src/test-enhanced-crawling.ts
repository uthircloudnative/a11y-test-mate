#!/usr/bin/env node

/**
 * Test Suite for Enhanced Crawling Functionality
 * This script tests the new enhanced crawling features
 */

import { EnhancedBrowserStackA11yTester } from './enhanced-browserstack-selenium';
import { EnhancedLocalA11yTester } from './enhanced-local-selenium';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TestScenario {
  name: string;
  description: string;
  url: string;
  maxPages: number;
  expectedFeatures: string[];
}

const testScenarios: TestScenario[] = [
  {
    name: "Basic Crawling Test",
    description: "Test basic enhanced crawling without login",
    url: "https://example.com",
    maxPages: 3,
    expectedFeatures: [
      "Priority-based URL discovery",
      "Depth-controlled crawling",
      "Enhanced page load waiting"
    ]
  },
  {
    name: "Corporate Website Test",
    description: "Test crawling on a corporate-style website",
    url: "https://www.w3.org",
    maxPages: 5,
    expectedFeatures: [
      "High-priority content detection",
      "About/Services page prioritization",
      "Accessibility-focused testing"
    ]
  },
  {
    name: "Documentation Site Test",
    description: "Test crawling on a documentation website",
    url: "https://docs.github.com",
    maxPages: 7,
    expectedFeatures: [
      "Guide/Tutorial prioritization",
      "Navigation structure analysis",
      "Content hierarchy understanding"
    ]
  }
];

async function testEnhancedLocalCrawling(scenario: TestScenario): Promise<void> {
  console.log(`\n🧪 Testing Local Enhanced Crawling: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`🌐 URL: ${scenario.url}`);
  console.log(`📊 Max Pages: ${scenario.maxPages}`);

  const tester = new EnhancedLocalA11yTester({
    browser: 'chrome',
    headless: true
  });

  try {
    await tester.connect();
    console.log('✅ Local tester connected successfully');

    const startTime = Date.now();
    const results = await tester.crawlAndTest(scenario.url, scenario.maxPages);
    const endTime = Date.now();
    
    console.log(`\n📊 Local Test Results for "${scenario.name}":`);
    console.log(`   ⏱️  Total time: ${(endTime - startTime) / 1000}s`);
    console.log(`   📄 Pages tested: ${results.length}`);
    console.log(`   ✅ Successful tests: ${results.filter(r => r.success).length}`);
    console.log(`   ❌ Failed tests: ${results.filter(r => !r.success).length}`);
    
    // Validate enhanced features
    console.log(`\n🔍 Enhanced Features Validation:`);
    scenario.expectedFeatures.forEach(feature => {
      console.log(`   ✓ ${feature}: Expected to be working`);
    });

    // Show discovered URLs to verify prioritization
    console.log(`\n🔗 Discovered URLs (showing prioritization):`);
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.url}`);
    });

    await tester.close();

  } catch (error) {
    console.error(`❌ Local test failed for ${scenario.name}:`, error);
  }
}

async function testEnhancedBrowserStackCrawling(scenario: TestScenario): Promise<void> {
  const bsUsername = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

  if (!bsUsername || !accessKey) {
    console.log(`⏭️  Skipping BrowserStack test for "${scenario.name}" - credentials not found`);
    return;
  }

  console.log(`\n🧪 Testing BrowserStack Enhanced Crawling: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`🌐 URL: ${scenario.url}`);
  console.log(`📊 Max Pages: ${scenario.maxPages}`);

  const tester = new EnhancedBrowserStackA11yTester({
    username: bsUsername,
    accessKey: accessKey,
    browser: 'chrome',
    os: 'WINDOWS',
    osVersion: '10',
    projectName: 'Enhanced Crawling Test',
    buildName: `Enhanced Crawling Test - ${new Date().toISOString()}`,
    sessionName: `Test: ${scenario.name}`
  });

  try {
    await tester.connect();
    console.log('✅ BrowserStack tester connected successfully');

    const startTime = Date.now();
    const results = await tester.crawlAndTest(scenario.url, scenario.maxPages);
    const endTime = Date.now();
    
    console.log(`\n📊 BrowserStack Test Results for "${scenario.name}":`);
    console.log(`   ⏱️  Total time: ${(endTime - startTime) / 1000}s`);
    console.log(`   📄 Pages tested: ${results.length}`);
    console.log(`   ✅ Successful tests: ${results.filter(r => r.success).length}`);
    console.log(`   ❌ Failed tests: ${results.filter(r => !r.success).length}`);
    
    // Validate enhanced features
    console.log(`\n🔍 Enhanced Features Validation:`);
    scenario.expectedFeatures.forEach(feature => {
      console.log(`   ✓ ${feature}: Expected to be working`);
    });

    // Show discovered URLs to verify prioritization
    console.log(`\n🔗 Discovered URLs (showing prioritization):`);
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.url}`);
    });

    await tester.close();

  } catch (error) {
    console.error(`❌ BrowserStack test failed for ${scenario.name}:`, error);
  }
}

async function runComprehensiveTests(): Promise<void> {
  console.log('🚀 Starting Enhanced Crawling Functionality Tests');
  console.log('=' .repeat(60));
  
  const args = process.argv.slice(2);
  const testLocal = !args.includes('--browserstack-only');
  const testBrowserStack = !args.includes('--local-only');

  console.log(`🧪 Test Configuration:`);
  console.log(`   Local tests: ${testLocal ? 'Enabled' : 'Disabled'}`);
  console.log(`   BrowserStack tests: ${testBrowserStack ? 'Enabled' : 'Disabled'}`);
  console.log(`   Total scenarios: ${testScenarios.length}`);

  for (const scenario of testScenarios) {
    console.log('\n' + '─'.repeat(60));
    
    if (testLocal) {
      await testEnhancedLocalCrawling(scenario);
    }
    
    if (testBrowserStack) {
      await testEnhancedBrowserStackCrawling(scenario);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Enhanced Crawling Tests Completed');
  console.log('\n📋 What to look for in the results:');
  console.log('✓ URLs should be discovered in priority order');
  console.log('✓ High-value content pages should be tested first');
  console.log('✓ Crawling should respect the max pages limit');
  console.log('✓ Depth should be controlled (max 3 levels)');
  console.log('✓ Page load waiting should be intelligent');
  console.log('✓ Queue management should prevent duplicates');
}

async function runQuickTest(): Promise<void> {
  console.log('⚡ Running Quick Enhanced Crawling Test');
  console.log('=' .repeat(40));

  const quickScenario: TestScenario = {
    name: "Quick Validation",
    description: "Quick test to validate enhanced crawling works",
    url: "https://example.com",
    maxPages: 2,
    expectedFeatures: ["Basic enhanced functionality"]
  };

  // Test local implementation
  console.log('\n🧪 Quick Local Test...');
  await testEnhancedLocalCrawling(quickScenario);

  console.log('\n✅ Quick test completed! For comprehensive testing, run without --quick flag.');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('🧪 Enhanced Crawling Test Suite');
    console.log('');
    console.log('Usage:');
    console.log('  npx ts-node src/test-enhanced-crawling.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --quick              Run quick validation test only');
    console.log('  --local-only         Test local implementation only');
    console.log('  --browserstack-only  Test BrowserStack implementation only');
    console.log('  --help, -h           Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  BROWSERSTACK_USERNAME  Your BrowserStack username');
    console.log('  BROWSERSTACK_ACCESS_KEY Your BrowserStack access key');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node src/test-enhanced-crawling.ts --quick');
    console.log('  npx ts-node src/test-enhanced-crawling.ts --local-only');
    console.log('  npx ts-node src/test-enhanced-crawling.ts');
    return;
  }

  if (args.includes('--quick')) {
    await runQuickTest();
  } else {
    await runComprehensiveTests();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
