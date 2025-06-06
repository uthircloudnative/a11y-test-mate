#!/usr/bin/env node

import { runEnhancedBrowserStackA11yTest } from './enhanced-browserstack-selenium';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Enhanced BrowserStack Accessibility Tester');
  console.log('✅ Compatible with Free BrowserStack plans');
  console.log('🔐 Supports Login & Page Crawling\n');

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

  const maxPagesIndex = args.indexOf('--max-pages');
  const maxPages = maxPagesIndex >= 0 ? parseInt(args[maxPagesIndex + 1]) : 10;

  // Login configuration
  const loginUrlIndex = args.indexOf('--login-url');
  const loginUrl = loginUrlIndex >= 0 ? args[loginUrlIndex + 1] : null;

  const usernameIndex = args.indexOf('--username');
  const loginUsername = usernameIndex >= 0 ? args[usernameIndex + 1] : null;

  const passwordIndex = args.indexOf('--password');
  const loginPassword = passwordIndex >= 0 ? args[passwordIndex + 1] : null;

  const postLoginUrlIndex = args.indexOf('--post-login-url');
  const postLoginUrl = postLoginUrlIndex >= 0 ? args[postLoginUrlIndex + 1] : undefined;

  const usernameSelectorIndex = args.indexOf('--username-selector');
  const usernameSelector = usernameSelectorIndex >= 0 ? args[usernameSelectorIndex + 1] : 'input[name="username"]';

  const passwordSelectorIndex = args.indexOf('--password-selector');
  const passwordSelector = passwordSelectorIndex >= 0 ? args[passwordSelectorIndex + 1] : 'input[name="password"]';

  const submitSelectorIndex = args.indexOf('--submit-selector');
  const submitSelector = submitSelectorIndex >= 0 ? args[submitSelectorIndex + 1] : 'button[type="submit"]';
  
  if (!url) {
    console.log('❌ Usage: npm run test-enhanced-browserstack -- --url <URL> [options]');
    console.log('\n📋 Basic Options:');
    console.log('  --url <URL>              Starting URL to test (required)');
    console.log('  --browser <name>         Browser: chrome, firefox, safari, edge (default: chrome)');
    console.log('  --os <name>              OS: WINDOWS, MAC (default: WINDOWS)');
    console.log('  --max-pages <number>     Maximum pages to crawl and test (default: 10)');
    console.log('  --output <path>          Output file path (optional)');
    console.log('\n🔐 Login Options (all required for login):');
    console.log('  --login-url <URL>        Login page URL');
    console.log('  --username <username>    Login username');
    console.log('  --password <password>    Login password');
    console.log('  --post-login-url <URL>   URL after successful login (optional - will auto-detect if not provided)');
    console.log('  --username-selector <css> CSS selector for username field (default: input[name="username"])');
    console.log('  --password-selector <css> CSS selector for password field (default: input[name="password"])');
    console.log('  --submit-selector <css>   CSS selector for submit button (default: button[type="submit"])');
    console.log('\n🌟 Examples:');
    console.log('\n  # Simple crawling without login:');
    console.log('  npm run test-enhanced-browserstack -- --url "https://example.com" --max-pages 5');
    console.log('\n  # With login and crawling:');
    console.log('  npm run test-enhanced-browserstack -- \\');
    console.log('    --url "https://example.com" \\');
    console.log('    --login-url "https://example.com/login" \\');
    console.log('    --username "myuser" \\');
    console.log('    --password "mypass" \\');
    console.log('    --post-login-url "https://example.com/dashboard" \\');
    console.log('    --max-pages 15');
    process.exit(1);
  }

  // Get BrowserStack credentials
  const bsUsername = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

  if (!bsUsername || !accessKey) {
    console.error('❌ BrowserStack credentials not found in environment variables');
    console.error('   Please check your .env file contains:');
    console.error('   BROWSERSTACK_USERNAME=your_username');
    console.error('   BROWSERSTACK_ACCESS_KEY=your_access_key');
    process.exit(1);
  }

  // Prepare login configuration if provided
  let loginConfig = undefined;
  if (loginUrl && loginUsername && loginPassword) {
    loginConfig = {
      loginUrl,
      usernameSelector,
      passwordSelector,
      submitSelector,
      username: loginUsername,
      password: loginPassword,
      postLoginUrl
    };
    console.log('🔐 Login configuration detected');
  }

  console.log('📋 Configuration:');
  console.log(`   Starting URL: ${url}`);
  console.log(`   Browser: ${browser}`);
  console.log(`   OS: ${os}`);
  console.log(`   Max pages: ${maxPages}`);
  console.log(`   Login required: ${loginConfig ? 'Yes' : 'No'}`);
  if (loginConfig) {
    console.log(`   Login URL: ${loginConfig.loginUrl}`);
    console.log(`   Login username: ${loginConfig.username}`);
    console.log(`   Post-login URL: ${loginConfig.postLoginUrl || 'Auto-detect'}`);
  }
  console.log(`   BrowserStack username: ${bsUsername}`);
  console.log('');

  try {
    await runEnhancedBrowserStackA11yTest({
      startUrl: url,
      username: bsUsername,
      accessKey,
      browser,
      os,
      maxPages,
      outputPath: output,
      loginConfig
    });
    
    console.log('\n🎉 Enhanced BrowserStack accessibility test completed successfully!');
    console.log('🔗 View detailed session logs at: https://automate.browserstack.com/dashboard');
    
  } catch (error) {
    console.error('\n❌ Enhanced BrowserStack test execution failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your BrowserStack credentials');
    console.log('2. Verify login credentials and selectors');
    console.log('3. Ensure target website is accessible');
    console.log('4. Check network connectivity');
    console.log('5. Try with different browser/OS combinations');
    console.log('6. Verify CSS selectors for login form elements');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
