import { chromium, Page, Browser } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse command line arguments for url, username, and password
const argv = process.argv.slice(2);
function getArg(flag: string, fallback: string) {
  const idx = argv.indexOf(flag);
  return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : fallback;
}

const USE_BROWSERSTACK = getArg('--browserstack', 'false') === 'true';
const BROWSER_TYPE = getArg('--browser', 'chrome');
const OS_TYPE = getArg('--os', 'Windows');
const OS_VERSION = getArg('--os-version', '11');

const loginConfig = {
  loginUrl: getArg('--url', 'https://example.com/login'),
  usernameSelector: 'input[name="username"]',
  passwordSelector: 'input[name="password"]',
  submitSelector: 'button[type="submit"]',
  username: getArg('--username', 'your-username'),
  password: getArg('--password', 'your-password'),
  postLoginUrl: getArg('--post-login-url', 'https://example.com/dashboard'),
};

// BrowserStack configuration
const getBrowserStackCapabilities = () => ({
  'bstack:options': {
    'os': OS_TYPE,
    'osVersion': OS_VERSION,
    'browserName': BROWSER_TYPE,
    'browserVersion': 'latest',
    'sessionName': 'Accessibility Testing Session',
    'projectName': 'A11y Test Mate',
    'buildName': `A11y Test - ${new Date().toISOString().split('T')[0]}`,
    'debug': true,
    'networkLogs': true,
    'seleniumLogs': true,
    'local': false,
    'userName': process.env.BROWSERSTACK_USERNAME,
    'accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
  }
});

async function connectToBrowserStack(): Promise<Browser> {
  const capabilities = getBrowserStackCapabilities();
  const cdpEndpoint = `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(capabilities))}`;
  
  console.log('🌐 Connecting to BrowserStack...');
  console.log(`📊 Browser: ${BROWSER_TYPE} on ${OS_TYPE} ${OS_VERSION}`);
  
  return chromium.connectOverCDP(cdpEndpoint);
}

async function connectToLocalBrowser(): Promise<Browser> {
  console.log('💻 Starting local browser...');
  return chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
}

async function login(page: Page, config: typeof loginConfig): Promise<string> {
  await page.goto(config.loginUrl);
  await page.fill(config.usernameSelector, config.username);
  await page.fill(config.passwordSelector, config.password);
  await page.click(config.submitSelector);
  await page.waitForNavigation();
  
  // Return the current URL after login for crawling
  return page.url();
}

async function getInternalLinks(page: Page, baseUrl: string): Promise<string[]> {
  const base = new URL(baseUrl);
  const links = await page.$$eval('a[href]', as =>
    as.map(a => (a as HTMLAnchorElement).href)
  );
  return Array.from(new Set(
    links.filter(href => {
      try {
        const u = new URL(href);
        return u.origin === base.origin;
      } catch { return false; }
    })
  ));
}

async function runA11y(page: Page) {
  return new AxeBuilder({ page }).analyze();
}

async function crawlAndTest(page: Page, startUrl: string, visited = new Set<string>()) {
  const queue: string[] = [startUrl];
  const results: any[] = [];

  while (queue.length) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    results.push({ url, a11y: await runA11y(page) });

    const links = await getInternalLinks(page, startUrl);
    for (const link of links) if (!visited.has(link)) queue.push(link);
  }
  return results;
}

function generateHtmlReport(results: any[]): string {
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Accessibility Report</title><style>body{font-family:sans-serif;}h2{margin-top:2em;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ccc;padding:8px;}th{background:#eee;}tr.issue{background:#ffeaea;}</style></head><body>`;
  html += `<h1>Accessibility Report</h1>`;
  for (const page of results) {
    html += `<h2>${page.url}</h2>`;
    if (page.a11y.violations && page.a11y.violations.length > 0) {
      html += `<table><tr><th>Issue</th><th>Impact</th><th>Description</th><th>Nodes</th></tr>`;
      for (const v of page.a11y.violations) {
        html += `<tr class="issue"><td>${v.id}</td><td>${v.impact || ''}</td><td>${v.description}</td><td>${v.nodes.map((n: any) => n.html).join('<hr>')}</td></tr>`;
      }
      html += `</table>`;
    } else {
      html += `<p style="color:green;">No accessibility violations found.</p>`;
    }
  }
  html += `</body></html>`;
  return html;
}

async function main() {
  console.log('🚀 Starting A11y Test Mate...');
  console.log(`🎯 Login URL: ${loginConfig.loginUrl}`);
  console.log(`👤 Username: ${loginConfig.username}`);
  console.log(`🔍 Mode: ${USE_BROWSERSTACK ? 'BrowserStack Cloud' : 'Local Browser'}`);
  
  if (loginConfig.postLoginUrl !== 'https://example.com/dashboard') {
    console.log(`📍 Post-login URL specified: ${loginConfig.postLoginUrl}`);
  } else {
    console.log('📍 Post-login URL: Auto-detect after login');
  }
  
  let browser: Browser | undefined;
  
  try {
    // Connect to browser (BrowserStack or local)
    if (USE_BROWSERSTACK) {
      if (!process.env.BROWSERSTACK_USERNAME || !process.env.BROWSERSTACK_ACCESS_KEY) {
        console.error('❌ BrowserStack credentials not found in environment variables');
        console.log('Please set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY in your .env file');
        process.exit(1);
      }
      browser = await connectToBrowserStack();
    } else {
      browser = await connectToLocalBrowser();
    }

    const page = await browser.newPage();
    
    // Perform login and get starting URL
    console.log('🔐 Logging in...');
    const startingUrl = await login(page, loginConfig);
    
    // Use post-login-url if provided, otherwise use the URL we landed on after login
    const crawlStartUrl = loginConfig.postLoginUrl !== 'https://example.com/dashboard' 
      ? loginConfig.postLoginUrl 
      : startingUrl;
    
    console.log(`🕷️ Starting crawl from: ${crawlStartUrl}`);
    console.log('🔍 Crawling and testing pages...');
    const results = await crawlAndTest(page, crawlStartUrl);
    
    // Save results to a timestamped JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), `a11y-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📊 JSON report saved to: ${reportPath}`);
    
    // Save HTML report
    const htmlReportPath = path.join(process.cwd(), `a11y-report-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, generateHtmlReport(results));
    console.log(`📋 HTML report saved to: ${htmlReportPath}`);
    
    // Print summary
    const totalPages = results.length;
    const pagesWithIssues = results.filter(r => r.a11y.violations && r.a11y.violations.length > 0).length;
    const totalIssues = results.reduce((sum, r) => sum + (r.a11y.violations ? r.a11y.violations.length : 0), 0);
    
    console.log('\n📈 Test Summary:');
    console.log(`📄 Pages tested: ${totalPages}`);
    console.log(`⚠️  Pages with issues: ${pagesWithIssues}`);
    console.log(`🐛 Total accessibility issues: ${totalIssues}`);
    
    if (USE_BROWSERSTACK) {
      console.log('\n🌐 BrowserStack session completed');
      console.log('🔗 Check your BrowserStack dashboard for detailed logs and recordings');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error instanceof Error ? error.message : String(error));
    
    if (USE_BROWSERSTACK && error instanceof Error) {
      if (error.message.includes('WebSocket')) {
        console.log('\n🔧 BrowserStack connection troubleshooting:');
        console.log('1. Verify your credentials in .env file');
        console.log('2. Check your BrowserStack plan supports Playwright');
        console.log('3. Ensure you have active parallel sessions available');
      }
    }
    
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
