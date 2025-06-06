import { chromium } from 'playwright';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BROWSERSTACK_WS_ENDPOINT = 'ws://localhost:4545/playwright';

async function testBrowserStackConnection() {
  console.log('🧪 Testing BrowserStack MCP Server Connection...');
  console.log(`📡 Connecting to: ${BROWSERSTACK_WS_ENDPOINT}`);
  
  try {
    console.log('⏳ Attempting to connect...');
    const browser = await chromium.connect(BROWSERSTACK_WS_ENDPOINT);
    
    console.log('✅ Successfully connected to BrowserStack MCP server!');
    console.log('🌐 Creating a new page...');
    
    const page = await browser.newPage();
    console.log('✅ New page created successfully!');
    
    console.log('🔗 Navigating to example.com...');
    await page.goto('https://example.com');
    
    const title = await page.title();
    console.log(`✅ Page loaded successfully! Title: "${title}"`);
    
    await browser.close();
    console.log('✅ Connection test completed successfully!');
    console.log('🎉 Your BrowserStack MCP server is working correctly!');
    
  } catch (error) {
    console.log('❌ Connection test failed!');
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Make sure the BrowserStack MCP server is running:');
      console.log('   npm run start-browserstack');
      console.log('2. Check server status:');
      console.log('   npm run check-server');
      console.log('3. Verify your BrowserStack credentials in .env file');
    }
    
    process.exit(1);
  }
}

testBrowserStackConnection();
