#!/usr/bin/env node

import { runBrowserStackA11yTest } from './browserstack-selenium';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 BrowserStack Accessibility Tester (Selenium WebDriver)');
  console.log('✅ Compatible with Free BrowserStack plans\n');

  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const urlIndex = args.indexOf('--url');
  const url = urlIndex >= 0 ? args[urlIndex + 1] : null;
  
  const outputIndex = args.indexOf('--output');
  const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  
  const browserIndex = args.indexOf('--browser');
  const browser = browserIndex >= 0 ? args[browserIndex + 1] : 'chrome';
  
  const osIndex = args.indexOf('--os');
  const os = osIndex >= 0 ? args[osIndex + 1] : 'WINDOWS';
  
  if (!url) {
    console.log('❌ Usage: npm run test-browserstack -- --url <URL> [options]');
    console.log('\nOptions:');
    console.log('  --url <URL>        URL to test (required)');
    console.log('  --output <path>    Output file path (optional)');
    console.log('  --browser <name>   Browser: chrome, firefox, safari, edge (default: chrome)');
    console.log('  --os <name>        OS: WINDOWS, MAC (default: WINDOWS)');
    console.log('\nExample:');
    console.log('  npm run test-browserstack -- --url "https://example.com" --browser chrome --os WINDOWS');
    process.exit(1);
  }

  // Get BrowserStack credentials
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

  if (!username || !accessKey) {
    console.error('❌ BrowserStack credentials not found in environment variables');
    console.error('   Please check your .env file contains:');
    console.error('   BROWSERSTACK_USERNAME=your_username');
    console.error('   BROWSERSTACK_ACCESS_KEY=your_access_key');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   URL: ${url}`);
  console.log(`   Browser: ${browser}`);
  console.log(`   OS: ${os}`);
  console.log(`   Username: ${username}`);
  console.log('');

  try {
    await runBrowserStackA11yTest({
      urls: [url],
      username,
      accessKey,
      browser,
      os,
      outputPath: output
    });
    
    console.log('\n🎉 BrowserStack accessibility test completed successfully!');
    console.log('🔗 View detailed session logs at: https://automate.browserstack.com/dashboard');
    
  } catch (error) {
    console.error('\n❌ BrowserStack test execution failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your BrowserStack credentials');
    console.log('2. Verify your plan supports Selenium WebDriver');
    console.log('3. Ensure you have available parallel sessions');
    console.log('4. Check network connectivity');
    console.log('5. Try with different browser/OS combinations');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
