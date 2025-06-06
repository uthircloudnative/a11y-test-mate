/**
 * ===================================================================
 * BROWSERSTACK-SELENIUM.TS - BASIC BROWSERSTACK ACCESSIBILITY TESTING
 * ===================================================================
 * 
 * PURPOSE:
 * This file provides the core functionality for running accessibility tests
 * on BrowserStack's cloud platform using Selenium WebDriver. It's designed
 * to work with FREE BrowserStack accounts and doesn't require advanced features.
 * 
 * WHAT THIS FILE DOES:
 * 1. 🔗 Connects to BrowserStack's remote browsers in the cloud
 * 2. 🌐 Tests websites on different browsers and operating systems
 * 3. ♿ Scans for accessibility issues using the axe-core library
 * 4. 📊 Generates comprehensive JSON reports with results
 * 5. 🧹 Properly cleans up browser sessions when done
 * 
 * KEY BENEFITS:
 * ✅ Works with FREE BrowserStack plans (no paid features required)
 * ✅ No need to install browsers locally
 * ✅ Tests on real devices and browsers, not simulators
 * ✅ Supports parallel testing across different configurations
 * ✅ Automatic session management and cleanup
 * 
 * BROWSER/OS COMBINATIONS SUPPORTED:
 * - Chrome, Firefox, Safari, Edge
 * - Windows 10/11, macOS, iOS, Android
 * - Multiple browser versions
 * 
 * EXAMPLE USAGE:
 * ```typescript
 * const tester = new BrowserStackA11yTester({
 *   username: 'your-browserstack-username',
 *   accessKey: 'your-browserstack-key',
 *   browser: 'chrome',
 *   os: 'WINDOWS'
 * });
 * 
 * await tester.connect();
 * const results = await tester.testMultipleUrls(['https://example.com']);
 * tester.generateReport(results);
 * ```
 * 
 * NON-TYPESCRIPT DEVELOPERS NOTE:
 * - Interfaces define the structure of configuration objects
 * - async/await handles time-consuming operations like network requests
 * - Classes group related functionality together
 * - Error handling uses try/catch blocks for robust operation
 * ===================================================================
 */

// Import required libraries for browser automation and accessibility testing
import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import { AxeBuilder } from '@axe-core/webdriverjs';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration interface for BrowserStack connection
 * This defines what settings are needed to connect to BrowserStack
 */
interface BrowserStackConfig {
  username: string;           // Your BrowserStack username
  accessKey: string;          // Your BrowserStack access key
  browser?: string;           // Browser name (chrome, firefox, safari, edge)
  browserVersion?: string;    // Browser version (latest, specific version)
  os?: string;               // Operating system (WINDOWS, MAC)
  osVersion?: string;        // OS version (10, 11, Big Sur, etc.)
  projectName?: string;      // Project name for organizing tests
  buildName?: string;        // Build name for grouping test runs
  sessionName?: string;      // Individual session name
}

/**
 * Test result interface - defines the structure of test results
 * This is what gets returned after testing each URL
 */
interface A11yTestResult {
  url: string;              // The URL that was tested
  violations: any[];        // Array of accessibility violations found
  passes: any[];           // Array of accessibility rules that passed
  incomplete: any[];       // Array of rules that couldn't be fully tested
  timestamp: string;       // When the test was run
  browserInfo: string;     // Browser and OS information
  success: boolean;        // Whether the test completed successfully
  error?: string;          // Error message if test failed
}

/**
 * BrowserStack Accessibility Tester using Selenium WebDriver
 * This works with Free BrowserStack plans (no CDP required)
 */
export class BrowserStackA11yTester {
  private config: BrowserStackConfig;
  private driver?: WebDriver;

  constructor(config: BrowserStackConfig) {
    this.config = {
      browser: 'chrome',
      browserVersion: 'latest',
      os: 'WINDOWS',
      osVersion: '10',
      projectName: 'Accessibility Testing',
      buildName: `A11y Test ${new Date().toISOString()}`,
      sessionName: 'Accessibility Scan',
      ...config
    };
    
    // Normalize OS names for BrowserStack
    if (this.config.os) {
      const osMapping: Record<string, string> = {
        'Windows': 'WINDOWS',
        'OS X': 'MAC',
        'macOS': 'MAC',
        'Mac': 'MAC'
      };
      this.config.os = osMapping[this.config.os] || this.config.os.toUpperCase();
    }
  }

  /**
   * Connect to BrowserStack using Selenium WebDriver (works with Free plans)
   */
  async connect(): Promise<void> {
    console.log('🔗 Connecting to BrowserStack using Selenium WebDriver...');
    console.log(`📋 Plan: Free | Browser: ${this.config.browser} | OS: ${this.config.os}`);

    const capabilities = {
      'bstack:options': {
        'userName': this.config.username,
        'accessKey': this.config.accessKey,
        'projectName': this.config.projectName,
        'buildName': this.config.buildName,
        'sessionName': this.config.sessionName,
        'debug': true,
        'consoleLogs': 'info',
        'networkLogs': true
      },
      'browserName': this.config.browser,
      'browserVersion': this.config.browserVersion,
      'platformName': this.config.os,
      'platformVersion': this.config.osVersion
    };

    try {
      this.driver = await new Builder()
        .usingServer('https://hub-cloud.browserstack.com/wd/hub')
        .withCapabilities(capabilities)
        .build();
      
      console.log('✅ Connected to BrowserStack successfully');
      
      // Get session details
      const sessionId = await this.driver.getSession();
      console.log(`🔗 Session ID: ${sessionId.getId()}`);
      
    } catch (error) {
      console.error('❌ BrowserStack connection failed:', error);
      throw new Error(`BrowserStack connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run accessibility test on a URL
   */
  async testUrl(url: string): Promise<A11yTestResult> {
    if (!this.driver) {
      throw new Error('Not connected to BrowserStack. Call connect() first.');
    }

    console.log(`🧪 Testing: ${url}`);
    
    try {
      // Navigate to the URL
      await this.driver.get(url);
      
      // Wait for page to load
      await this.driver.sleep(3000); // Simple wait for page load
      
      // Get page title for verification
      const title = await this.driver.getTitle();
      console.log(`📄 Page loaded: "${title}"`);
      
      // Run accessibility analysis using axe-core
      const results = await new AxeBuilder(this.driver).analyze();
      
      const browserInfo = `${this.config.browser} ${this.config.browserVersion} on ${this.config.os} ${this.config.osVersion}`;
      
      console.log(`📊 Results for ${url}:`);
      console.log(`   ❌ Violations: ${results.violations.length}`);
      console.log(`   ✅ Passes: ${results.passes.length}`);
      console.log(`   ⚠️  Incomplete: ${results.incomplete.length}`);

      return {
        url,
        violations: results.violations,
        passes: results.passes,
        incomplete: results.incomplete,
        timestamp: new Date().toISOString(),
        browserInfo,
        success: true
      };

    } catch (error) {
      console.error(`❌ Test failed for ${url}:`, error);
      
      return {
        url,
        violations: [],
        passes: [],
        incomplete: [],
        timestamp: new Date().toISOString(),
        browserInfo: `${this.config.browser} ${this.config.browserVersion}`,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test multiple URLs
   */
  async testMultipleUrls(urls: string[]): Promise<A11yTestResult[]> {
    const results: A11yTestResult[] = [];
    
    for (const url of urls) {
      const result = await this.testUrl(url);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }

  /**
   * Generate comprehensive report
   */
  generateReport(results: A11yTestResult[], outputPath?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputPath || `browserstack-a11y-report-${timestamp}.json`;
    const fullPath = path.resolve(filename);

    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    const report = {
      summary: {
        totalUrls: results.length,
        successfulTests: successfulResults.length,
        failedTests: failedResults.length,
        totalViolations: successfulResults.reduce((sum, r) => sum + r.violations.length, 0),
        totalPasses: successfulResults.reduce((sum, r) => sum + r.passes.length, 0),
        totalIncomplete: successfulResults.reduce((sum, r) => sum + r.incomplete.length, 0),
        browser: this.config.browser,
        os: this.config.os,
        generatedAt: new Date().toISOString()
      },
      browserStackInfo: {
        plan: 'Free',
        method: 'Selenium WebDriver',
        sessionInfo: 'Available in BrowserStack dashboard'
      },
      results: results.map(r => ({
        ...r,
        violationSummary: r.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length
        }))
      }))
    };

    fs.writeFileSync(fullPath, JSON.stringify(report, null, 2));
    
    console.log('\n📄 BrowserStack Report Generated:');
    console.log(`   📁 File: ${fullPath}`);
    console.log(`   🌐 URLs tested: ${results.length}`);
    console.log(`   ✅ Successful: ${successfulResults.length}`);
    console.log(`   ❌ Failed: ${failedResults.length}`);
    console.log(`   🔍 Browser: ${this.config.browser} on ${this.config.os}`);
    
    if (successfulResults.length > 0) {
      console.log(`   🐛 Total violations: ${report.summary.totalViolations}`);
      
      // Show session URL
      console.log(`   🔗 View session: https://automate.browserstack.com/dashboard`);
    }
    
    return fullPath;
  }

  /**
   * Close the BrowserStack session
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      console.log('🔒 BrowserStack session closed');
    }
  }
}

/**
 * Main execution function for BrowserStack testing
 */
export async function runBrowserStackA11yTest(options: {
  urls: string[];
  username: string;
  accessKey: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  outputPath?: string;
}): Promise<void> {
  const tester = new BrowserStackA11yTester({
    username: options.username,
    accessKey: options.accessKey,
    browser: options.browser,
    browserVersion: options.browserVersion,
    os: options.os,
    osVersion: options.osVersion,
    projectName: 'A11y Test Suite',
    buildName: `Accessibility Testing - ${new Date().toISOString()}`,
    sessionName: `A11y Test - ${options.urls.length} URLs`
  });

  try {
    // Connect to BrowserStack
    await tester.connect();
    
    // Run tests
    console.log(`\n🚀 Starting accessibility tests on ${options.urls.length} URL(s)...\n`);
    const results = await tester.testMultipleUrls(options.urls);
    
    // Generate report
    const reportPath = tester.generateReport(results, options.outputPath);
    
    // Print summary
    const successfulResults = results.filter(r => r.success);
    const totalViolations = successfulResults.reduce((sum, r) => sum + r.violations.length, 0);
    
    console.log('\n🎯 BrowserStack Test Summary:');
    console.log(`   URLs tested: ${results.length}`);
    console.log(`   Successful tests: ${successfulResults.length}`);
    console.log(`   Total violations: ${totalViolations}`);
    console.log(`   Report: ${reportPath}`);
    
    if (totalViolations > 0) {
      console.log('\n⚠️  Accessibility issues found. Check the BrowserStack dashboard and report for details.');
      
      // Show top violations
      const allViolations = successfulResults.flatMap(r => r.violations);
      const violationCounts = allViolations.reduce((acc, v) => {
        acc[v.id] = (acc[v.id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topViolations = Object.entries(violationCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3);
      
      if (topViolations.length > 0) {
        console.log('\n🔍 Top Issues Found:');
        topViolations.forEach(([id, count], index) => {
          const violation = allViolations.find(v => v.id === id);
          console.log(`   ${index + 1}. ${id} (${count}x) - ${violation?.impact || 'unknown'} impact`);
        });
      }
    } else {
      console.log('\n🎉 No accessibility violations found!');
    }
    
  } catch (error) {
    console.error('\n❌ BrowserStack test failed:', error);
    throw error;
  } finally {
    await tester.close();
  }
}
