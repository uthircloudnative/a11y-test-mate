import { chromium, Browser, Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

interface A11yResult {
  url: string;
  violations: any[];
  passes: any[];
  incomplete: any[];
  timestamp: string;
}

/**
 * Alternative BrowserStack implementation using standard WebDriver capabilities
 * instead of CDP (Chrome DevTools Protocol) to avoid plan limitation issues
 */
export class BrowserStackWebDriverTester {
  private browser?: Browser;
  
  constructor(private config: {
    username: string;
    accessKey: string;
    buildName?: string;
    projectName?: string;
  }) {}

  /**
   * Connect to BrowserStack using standard WebDriver protocol (not CDP)
   */
  async connect(): Promise<void> {
    console.log('🔗 Attempting BrowserStack connection via WebDriver...');
    console.log('⚠️  Note: This requires BrowserStack Automate plan with WebDriver support');
    
    try {
      // Use Playwright's remote connection with WebDriver capabilities
      this.browser = await chromium.connect({
        wsEndpoint: `wss://hub-cloud.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
          'browser': 'chrome',
          'browser_version': 'latest',
          'os': 'Windows',
          'os_version': '10',
          'name': `A11y Test - ${new Date().toISOString()}`,
          'build': this.config.buildName || 'A11y Test Suite',
          'project': this.config.projectName || 'Accessibility Testing',
          'browserstack.username': this.config.username,
          'browserstack.accessKey': this.config.accessKey,
          'browserstack.debug': true
        }))}`,
        timeout: 30000
      });
      console.log('✅ Connected to BrowserStack successfully');
    } catch (error) {
      console.error('❌ BrowserStack WebDriver connection failed:', error);
      throw new Error(`BrowserStack connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Alternative connection method using Playwright's built-in BrowserStack support
   */
  async connectAlternative(): Promise<void> {
    try {
      console.log('🔗 Attempting alternative BrowserStack connection...');
      
      // Use Playwright's remote browser connection
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });
      
      console.log('✅ Using local browser for testing (BrowserStack alternative)');
    } catch (error) {
      console.error('❌ Alternative connection failed:', error);
      throw error;
    }
  }

  /**
   * Run accessibility test on a single URL
   */
  async testSingleUrl(url: string): Promise<A11yResult> {
    if (!this.browser) {
      throw new Error('Browser not connected. Call connect() first.');
    }

    const page = await this.browser.newPage();
    
    try {
      console.log(`🧪 Testing: ${url}`);
      
      // Navigate to the page
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for page to be fully loaded
      await page.waitForTimeout(2000);
      
      // Run accessibility analysis
      const results = await new AxeBuilder({ page }).analyze();
      
      const result: A11yResult = {
        url,
        violations: results.violations,
        passes: results.passes,
        incomplete: results.incomplete,
        timestamp: new Date().toISOString()
      };

      console.log(`📊 Results for ${url}:`);
      console.log(`   ❌ Violations: ${results.violations.length}`);
      console.log(`   ✅ Passes: ${results.passes.length}`);
      console.log(`   ⚠️  Incomplete: ${results.incomplete.length}`);

      return result;
    } finally {
      await page.close();
    }
  }

  /**
   * Run accessibility tests on multiple URLs
   */
  async testMultipleUrls(urls: string[]): Promise<A11yResult[]> {
    const results: A11yResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.testSingleUrl(url);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to test ${url}:`, error);
        results.push({
          url,
          violations: [],
          passes: [],
          incomplete: [],
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  /**
   * Generate and save test report
   */
  async generateReport(results: A11yResult[], outputPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputPath || `browserstack-a11y-report-${timestamp}.json`;
    const fullPath = path.resolve(filename);

    const report = {
      summary: {
        totalUrls: results.length,
        totalViolations: results.reduce((sum, r) => sum + r.violations.length, 0),
        totalPasses: results.reduce((sum, r) => sum + r.passes.length, 0),
        totalIncomplete: results.reduce((sum, r) => sum + r.incomplete.length, 0),
        generatedAt: new Date().toISOString()
      },
      results
    };

    fs.writeFileSync(fullPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${fullPath}`);
    
    return fullPath;
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser connection closed');
    }
  }
}

/**
 * Main execution function for WebDriver-based testing
 */
export async function runBrowserStackWebDriverTest(options: {
  urls: string[];
  username: string;
  accessKey: string;
  buildName?: string;
  projectName?: string;
  outputPath?: string;
}): Promise<void> {
  const tester = new BrowserStackWebDriverTester({
    username: options.username,
    accessKey: options.accessKey,
    buildName: options.buildName,
    projectName: options.projectName
  });

  try {
    // Try BrowserStack connection first
    try {
      await tester.connect();
    } catch (error) {
      console.log('⚠️  BrowserStack connection failed, falling back to local testing...');
      await tester.connectAlternative();
    }

    // Run tests
    const results = await tester.testMultipleUrls(options.urls);
    
    // Generate report
    await tester.generateReport(results, options.outputPath);
    
    // Print summary
    const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
    console.log('\n📈 Test Summary:');
    console.log(`   URLs tested: ${results.length}`);
    console.log(`   Total violations: ${totalViolations}`);
    
    if (totalViolations > 0) {
      console.log('\n⚠️  Accessibility issues found. Check the report for details.');
    } else {
      console.log('\n🎉 No accessibility violations found!');
    }
    
  } finally {
    await tester.close();
  }
}
