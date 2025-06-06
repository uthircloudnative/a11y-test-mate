#!/usr/bin/env node

import { runEnhancedLocalA11yTest } from './enhanced-local-selenium';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse command line arguments
const argv = process.argv.slice(2);

// Debug: Show all received arguments
console.log('🔍 Debug: Raw CLI arguments received:', JSON.stringify(argv, null, 2));

function getArg(flag: string, fallback?: string): string | undefined {
  const idx = argv.indexOf(flag);
  const value = idx !== -1 && argv[idx + 1] ? argv[idx + 1] : fallback;
  console.log(`🔍 Debug: ${flag} = "${value}" (index: ${idx})`);
  return value;
}

function hasFlag(flag: string): boolean {
  return argv.includes(flag);
}

function showHelp() {
  console.log(`
🎯 Enhanced Local A11y Tester with Login & Crawling

USAGE:
  npm run test-enhanced-local -- [options]

REQUIRED:
  --url <URL>              Website URL to test

OPTIONAL:
  --browser <browser>      Browser to use (chrome, firefox, edge, safari) [default: chrome]
  --headless              Run browser in headless mode
  --max-pages <number>    Maximum pages to crawl and test [default: 10]
  --output <path>         Output path for the report

LOGIN OPTIONS (optional):
  --login-url <URL>       Login page URL
  --username <username>   Login username
  --password <password>   Login password  
  --post-login-url <URL>  Expected URL after login (optional - will auto-detect if not provided)
  --username-selector <selector>  CSS selector for username field
  --password-selector <selector>  CSS selector for password field
  --submit-selector <selector>    CSS selector for submit button

EXAMPLES:

  # Simple test without login
  npm run test-enhanced-local -- --url "https://example.com"

  # Test with headless browser
  npm run test-enhanced-local -- --url "https://example.com" --headless

  # Test with Firefox
  npm run test-enhanced-local -- --url "https://example.com" --browser firefox

  # Test with login (automatic element detection)
  npm run test-enhanced-local -- \\
    --url "https://example.com" \\
    --login-url "https://example.com/login" \\
    --username "user@example.com" \\
    --password "password123" \\
    --max-pages 15

  # Test with login and custom selectors
  npm run test-enhanced-local -- \\
    --url "https://example.com" \\
    --login-url "https://example.com/login" \\
    --username "user@example.com" \\
    --password "password123" \\
    --username-selector "#email" \\
    --password-selector "#password" \\
    --submit-selector "button[type='submit']"

FEATURES:
  ✅ Intelligent login element detection
  ✅ Multi-page crawling
  ✅ Comprehensive accessibility testing
  ✅ Local browser testing (Chrome, Firefox, Edge, Safari)
  ✅ Headless mode support
  ✅ Detailed JSON reports
  ✅ Works with any website
`);
}

async function main() {
  // Show help if requested or no arguments
  if (hasFlag('--help') || hasFlag('-h') || argv.length === 0) {
    showHelp();
    process.exit(0);
  }

  // Get required arguments
  const startUrl = getArg('--url');
  if (!startUrl) {
    console.error('❌ Error: --url is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Get optional arguments
  const browser = getArg('--browser', 'chrome')!; // Non-null assertion since we provide fallback
  const headless = hasFlag('--headless');
  const maxPages = parseInt(getArg('--max-pages', '10')!);
  const outputPath = getArg('--output');

  // Login configuration
  const loginUrl = getArg('--login-url');
  const username = getArg('--username');
  const password = getArg('--password');
  const postLoginUrl = getArg('--post-login-url');
  const usernameSelector = getArg('--username-selector');
  const passwordSelector = getArg('--password-selector');
  const submitSelector = getArg('--submit-selector');

  // Build login config if login parameters provided
  let loginConfig;
  if (loginUrl && username && password) {
    loginConfig = {
      loginUrl,
      username,
      password,
      postLoginUrl,
      usernameSelector: usernameSelector || '',
      passwordSelector: passwordSelector || '',
      submitSelector: submitSelector || ''
    };
  }

  // Validate browser choice
  const supportedBrowsers = ['chrome', 'firefox', 'edge', 'safari'];
  if (!supportedBrowsers.includes(browser.toLowerCase())) {
    console.error(`❌ Error: Unsupported browser '${browser}'`);
    console.error(`Supported browsers: ${supportedBrowsers.join(', ')}`);
    process.exit(1);
  }

  // Display configuration
  console.log('🚀 Enhanced Local A11y Testing Configuration:');
  console.log(`   URL: ${startUrl}`);
  console.log(`   Browser: ${browser}`);
  console.log(`   Headless: ${headless ? 'Yes' : 'No'}`);
  console.log(`   Max Pages: ${maxPages}`);
  if (loginConfig) {
    console.log(`   Login: Yes (${loginConfig.loginUrl})`);
  } else {
    console.log(`   Login: No`);
  }
  if (outputPath) {
    console.log(`   Output: ${outputPath}`);
  }
  console.log('');

  try {
    await runEnhancedLocalA11yTest({
      startUrl,
      browser,
      headless,
      maxPages,
      outputPath,
      loginConfig
    });

    console.log('\n🎉 Enhanced local accessibility testing completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Enhanced local accessibility testing failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Testing interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Testing terminated');
  process.exit(0);
});

// Run the CLI
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
