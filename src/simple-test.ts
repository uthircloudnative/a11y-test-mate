import { chromium, Page, Browser } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
const argv = process.argv.slice(2);
function getArg(flag: string, fallback: string) {
  const idx = argv.indexOf(flag);
  return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : fallback;
}

const TARGET_URL = getArg('--url', 'https://example.com');

async function runSimpleA11yTest() {
  console.log('🚀 Starting Simple Accessibility Test...');
  console.log(`🎯 Target: ${TARGET_URL}`);
  
  let browser: Browser | undefined;
  
  try {
    // Launch local browser
    console.log('💻 Starting local browser...');
    browser = await chromium.launch({ 
      headless: true,  // Changed to headless for faster execution
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to the target URL
    console.log(`🌐 Loading ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Run accessibility test
    console.log('♿ Running accessibility scan...');
    const results = await new AxeBuilder({ page }).analyze();
    
    // Print summary immediately
    console.log('\n📈 Test Summary:');
    console.log(`🌐 URL tested: ${TARGET_URL}`);
    console.log(`❌ Violations: ${results.violations.length}`);
    console.log(`✅ Passes: ${results.passes.length}`);
    console.log(`⚠️  Incomplete: ${results.incomplete.length}`);
    
    if (results.violations.length > 0) {
      console.log('\n🔍 Violations found:');
      results.violations.slice(0, 5).forEach((v, i) => {
        console.log(`  ${i+1}. [${v.impact}] ${v.id}: ${v.description}`);
        console.log(`     Help: ${v.helpUrl}`);
      });
    } else {
      console.log('🎉 No accessibility violations found!');
    }
    
    // Generate timestamp for report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const reportData = {
      url: TARGET_URL,
      timestamp: new Date().toISOString(),
      summary: {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length
      },
      violations: results.violations,
      passes: results.passes.map(p => ({ id: p.id, description: p.description })), // Simplified passes
      incomplete: results.incomplete
    };
    
    const reportPath = path.join(process.cwd(), `simple-a11y-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📊 JSON report saved to: ${reportPath}`);
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runSimpleA11yTest();
