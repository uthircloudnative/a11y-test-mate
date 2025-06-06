# a11y-test-mate

A comprehensive accessibility testing framework that can automatically log into websites, crawl all internal pages, run accessibility tests using axe-core, and generate detailed reports. Supports both local execution and BrowserStack cloud testing.

## Features
- 🔐 Automated login with configurable selectors
- 🕷️ Intelligent page crawling for internal links
- ♿ Comprehensive accessibility testing with axe-core
- 📊 JSON and HTML report generation
- ☁️ BrowserStack cloud testing integration
- 🎯 Command-line interface for easy automation
- 📱 TypeScript support with full type safety
- 🚀 Simple single-page testing mode
- 🌐 Cross-platform support (Mac/Windows/Linux)

## 🚀 Quick Start Guide

### 1. **Install & Setup** (2 minutes)
```bash
# Clone and install
git clone <your-repo-url>
cd a11y-test-mate
npm install
npx playwright install
```

### 2. **Test Any Website Immediately**
```bash
# Test any public website (no setup required)
npm run simple-test -- --url "https://www.google.com"
npm run simple-test -- --url "https://github.com"
npm run simple-test -- --url "https://your-website.com"
```

### 3. **Test With Login & Page Crawling**
```bash
# Local comprehensive testing
npm run test-enhanced-local -- \
  --url "https://yoursite.com" \
  --login-url "https://yoursite.com/login" \
  --username "your-username" \
  --password "your-password"

# Or use the main framework
npm run run-a11y-local -- \
  --url "https://yoursite.com/login" \
  --username "your-username" \
  --password "your-password"
```

### 4. **BrowserStack Cloud Testing** (Optional)
```bash
# Setup credentials in .env file first
echo "BROWSERSTACK_USERNAME=your_username" > .env
echo "BROWSERSTACK_ACCESS_KEY=your_access_key" >> .env

# Run on BrowserStack cloud
npm run test-enhanced-browserstack -- --url "https://yoursite.com"
npm run test-browserstack -- --url "https://yoursite.com" --browser chrome --os WINDOWS
```

---

## Quick Start

### Prerequisites

#### System Requirements
- **Node.js** (v16 or higher, **v18.x+ recommended**) - [Download here](https://nodejs.org/)
  - Built-in fetch support (Node.js 18+) provides better performance
  - Compatible with Node.js 16.x with polyfills
- **npm** (comes with Node.js) - Package manager for dependencies
- **Git** (optional) - For cloning the repository from version control

#### Operating System Support
- **Windows** 10/11 (Command Prompt, PowerShell, Git Bash)
- **macOS** 10.15+ (Terminal, iTerm2)
- **Linux** (Ubuntu 18.04+, CentOS 7+, other distributions)

#### Development Tools
- **TypeScript Compiler** - Installed automatically via `typescript` package
- **ts-node** - For direct TypeScript execution (included in dependencies)
- **Text Editor/IDE** - VS Code, WebStorm, or any editor with TypeScript support

#### Browser Requirements
- **Playwright** will automatically download required browser binaries:
  - Chromium (latest stable)
  - Firefox (latest stable)  
  - WebKit/Safari (latest stable)
- **System browsers** (optional) - For local testing with system-installed browsers

#### Network & Permissions
- **Internet connection** - Required for:
  - Installing npm dependencies
  - Downloading Playwright browser binaries
  - BrowserStack cloud testing (optional)
  - Accessing target websites for testing
- **File system permissions** - Write access for:
  - Installing node_modules
  - Creating test reports and output files
  - Executing shell scripts (.sh files on macOS/Linux)

#### Optional Dependencies (Cloud Testing)
- **BrowserStack Account** - For cloud-based cross-browser testing
  - Free trial available at [browserstack.com](https://www.browserstack.com/)
  - Username and Access Key required
- **Environment Variables** - For secure credential storage
  - Support for `.env` files
  - System environment variables

#### Memory & Performance
- **RAM**: 4GB minimum, 8GB+ recommended for multiple browser instances
- **Storage**: 2GB free space for browser binaries and dependencies
- **CPU**: Multi-core recommended for parallel test execution

### 1. Setup Project

**Clone or Download:**
```bash
# Option 1: Clone repository
git clone <your-repo-url>
cd a11y-test-mate

# Option 2: Or download and extract ZIP file
```

**Install Dependencies:**
```bash
npm install
```

**Install Playwright Browsers (Required):**
```bash
# This downloads the browser binaries needed for testing
npx playwright install
```

### 2. Quick Test (No Setup Required)

**Test any public website immediately:**

**macOS/Linux:**
```bash
# Test Google's homepage
npm run simple-test -- --url "https://www.google.com"

# Test any public website
npm run simple-test -- --url "https://yourwebsite.com"
```

**Windows (Command Prompt):**
```cmd
npm run simple-test -- --url "https://www.google.com"
```

**Windows (PowerShell):**
```powershell
npm run simple-test -- --url "https://www.google.com"
```

### 3. Setup BrowserStack (Optional - For Cloud Testing)

**Get BrowserStack Credentials:**
1. Sign up at [BrowserStack](https://www.browserstack.com/)
2. Go to [Account Settings](https://www.browserstack.com/accounts/profile/details)
3. Copy your Username and Access Key

**Configure Environment Variables:**

**Option 1: Create .env file (Recommended)**
```bash
# Create .env file in project root
cat > .env << EOF
# BrowserStack Credentials
BROWSERSTACK_USERNAME=your_username_here
BROWSERSTACK_ACCESS_KEY=your_access_key_here

# MCP Server Configuration
MCP_SERVER_PORT=4545
MCP_SERVER_HOST=localhost
EOF
```

**Option 2: Set Environment Variables**

**macOS/Linux:**
```bash
export BROWSERSTACK_USERNAME="your_username_here"
export BROWSERSTACK_ACCESS_KEY="your_access_key_here"
```

**Windows (Command Prompt):**
```cmd
set BROWSERSTACK_USERNAME=your_username_here
set BROWSERSTACK_ACCESS_KEY=your_access_key_here
```

**Windows (PowerShell):**
```powershell
$env:BROWSERSTACK_USERNAME="your_username_here"
$env:BROWSERSTACK_ACCESS_KEY="your_access_key_here"
```

## Testing Framework Overview

The **a11y-test-mate** framework provides multiple testing approaches to suit different needs:

### 🎯 **Testing Approaches**

| Approach | File | Best For | Features |
|----------|------|----------|----------|
| **Simple Testing** | `src/simple-test.ts` | Quick checks, public sites | Single page, fast execution |
| **Main Framework** | `src/main.ts` | Full-featured testing | Login, crawling, Playwright |
| **Enhanced Local** | `src/enhanced-local-cli.ts` | Advanced local testing | Multi-browser, detailed reports |
| **Enhanced BrowserStack** | `src/enhanced-browserstack-cli.ts` | Cloud testing | Cross-browser, Selenium WebDriver |
| **Basic BrowserStack** | `src/browserstack-cli.ts` | Simple cloud testing | Quick BrowserStack integration |

### 🔧 **Implementation Details**

- **Playwright Integration**: `src/main.ts` and `src/simple-test.ts` use Playwright for modern browser automation
- **Selenium WebDriver**: Enhanced testing scripts use Selenium for broader compatibility
- **Login Support**: Both `src/main.ts` and enhanced scripts support automated login
- **Page Crawling**: Intelligent crawling discovers and tests internal pages
- **Multiple Report Formats**: JSON and HTML reports with detailed accessibility findings

## Testing Modes

### Mode 1: Simple Testing (Single Page)
Perfect for quick accessibility checks on public websites.

**Features:**
- ✅ Tests single webpage
- ✅ No login required
- ✅ Fast execution (~10 seconds)
- ✅ Immediate results
- ✅ JSON report generation

**Usage:**
```bash
# Test any public website
npm run simple-test -- --url "https://example.com"

# Examples
npm run simple-test -- --url "https://www.google.com"
npm run simple-test -- --url "https://github.com"
npm run simple-test -- --url "https://stackoverflow.com"
```

### Mode 2: Comprehensive Testing (Multi-Page with Login)
For testing entire websites that require authentication.

**Features:**
- 🔐 Automated login
- 🕷️ Crawls all internal pages
- 📊 HTML + JSON reports
- ☁️ BrowserStack cloud testing
- 🎯 Detailed configuration options

**Local Testing:**
```bash
npm run run-a11y-local -- \
  --url "https://yoursite.com/login" \
  --username "your-username" \
  --password "your-password" \
  --post-login-url "https://yoursite.com/dashboard"
```

**BrowserStack Cloud Testing (Selenium WebDriver):**
```bash
# Test with Chrome on Windows
npm run test-browserstack -- --url "https://yoursite.com" --browser chrome --os WINDOWS

# Test with Firefox on macOS
npm run test-browserstack -- --url "https://yoursite.com" --browser firefox --os MAC

# Test with Safari on macOS
npm run test-browserstack -- --url "https://yoursite.com" --browser safari --os MAC

# Test with Edge on Windows
npm run test-browserstack -- --url "https://yoursite.com" --browser edge --os WINDOWS
```

## Command Line Options

### Simple Test Options
| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--url` | Website URL to test | `https://example.com` | `--url "https://google.com"` |

### Comprehensive Test Options
| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--url` | Login page URL | `https://example.com/login` | `--url "https://app.com/login"` |
| `--username` | Login username | `your-username` | `--username "john@example.com"` |
| `--password` | Login password | `your-password` | `--password "mypassword123"` |
| `--post-login-url` | URL to start crawling from after login (optional - auto-detects if not provided) | `https://example.com/dashboard` | `--post-login-url "https://app.com/home"` |
| `--browser` | Browser type (chrome/firefox/safari/edge) | `chrome` | `--browser "firefox"` |
| `--os` | Operating System (Windows/OS X) | `Windows` | `--os "OS X"` |
| `--os-version` | OS version | `11` | `--os-version "10"` |

### 🎯 Auto-Detection Feature

**The `--post-login-url` parameter is now optional!** If you don't provide it, the framework will automatically detect the current URL after login and use it as the starting point for crawling.

**Examples:**
```bash
# With specified post-login URL
npm run test-enhanced-local -- --url "https://example.com" --login-url "https://example.com/login" --username "user" --password "pass" --post-login-url "https://example.com/dashboard"

# With auto-detection (no --post-login-url needed)
npm run test-enhanced-local -- --url "https://example.com" --login-url "https://example.com/login" --username "user" --password "pass"
```

The auto-detection feature:
- ✅ Captures the URL automatically after successful login
- ✅ Uses intelligent verification to ensure login success
- ✅ Falls back to specified URL if provided
- ✅ Works with complex authentication flows and redirects

## Platform-Specific Instructions

### macOS Setup

**Install Node.js:**
```bash
# Option 1: Download from nodejs.org
# Option 2: Using Homebrew
brew install node

# Verify installation
node --version
npm --version
```

**Clone and Setup:**
```bash
git clone <your-repo-url>
cd a11y-test-mate
npm install
npx playwright install
```

**Run Tests:**
```bash
# Simple test
npm run simple-test -- --url "https://www.google.com"

# Comprehensive test (local)
npm run run-a11y-local -- \
  --url "https://example.com/login" \
  --username "user" \
  --password "pass" \
  --post-login-url "https://example.com/dashboard"
```

### Windows Setup

**Install Node.js:**
1. Download from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Open Command Prompt or PowerShell and verify:
```cmd
node --version
npm --version
```

**Clone and Setup:**
```cmd
git clone <your-repo-url>
cd a11y-test-mate
npm install
npx playwright install
```

**Run Tests (Command Prompt):**
```cmd
REM Simple test
npm run simple-test -- --url "https://www.google.com"

REM Comprehensive test (local)
npm run run-a11y-local -- --url "https://example.com/login" --username "user" --password "pass" --post-login-url "https://example.com/dashboard"
```

**Run Tests (PowerShell):**
```powershell
# Simple test
npm run simple-test -- --url "https://www.google.com"

# Comprehensive test (local)
npm run run-a11y-local -- `
  --url "https://example.com/login" `
  --username "user" `
  --password "pass" `
  --post-login-url "https://example.com/dashboard"
```

### Linux Setup

**Install Node.js:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm

# Verify installation
node --version
npm --version
```

**Clone and Setup:**
```bash
git clone <your-repo-url>
cd a11y-test-mate
npm install
npx playwright install
```

## How It Works

### Simple Test Flow (simple-test.ts)
1. **Launch Browser**: Starts local Chrome browser in headless mode
2. **Navigate**: Goes to the specified URL
3. **Scan**: Runs axe-core accessibility analysis
4. **Report**: Displays results and saves JSON report

### Comprehensive Test Flow (main.ts)
1. **Login**: Automatically logs into the specified website using provided credentials
2. **Crawl**: Discovers all internal links starting from the post-login URL
3. **Test**: Runs accessibility tests on each discovered page using axe-core
4. **Report**: Generates timestamped JSON and HTML reports with detailed findings

## Available Scripts

### Core Testing Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run simple-test` | Single page accessibility test | Quick checks, public websites |
| `npm run run-a11y-local` | Comprehensive local testing | Development, private sites |
| `npm run run-a11y-browserstack` | Cloud testing via BrowserStack | Cross-browser testing |
| `npm run run-a11y` | Main testing entry point | Configurable local/cloud testing |

### Enhanced Testing Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run test-enhanced-local` | Enhanced local testing with multi-browser support | Advanced local testing |
| `npm run test-enhanced-browserstack` | Enhanced BrowserStack testing with login | Comprehensive cloud testing |
| `npm run test-browserstack` | Simple BrowserStack WebDriver testing | Basic cloud testing |

### MCP Server Management
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run start-browserstack` | Start BrowserStack MCP server | Enable AI-powered testing |
| `npm run check-server` | Check MCP server status | Verify server is running |

### Utility Scripts
| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run build` | Compile TypeScript | Build verification |
| `npm run test-connection` | Test BrowserStack connection | Verify credentials and connectivity |

## Example Test Commands

### Testing Popular Websites
```bash
# Test major websites for accessibility
npm run simple-test -- --url "https://www.google.com"
npm run simple-test -- --url "https://github.com"
npm run simple-test -- --url "https://stackoverflow.com"
npm run simple-test -- --url "https://www.wikipedia.org"
npm run simple-test -- --url "https://www.bbc.com"
```

### Testing Your Own Website
```bash
# Simple public page test
npm run simple-test -- --url "https://yourwebsite.com"

# Comprehensive site audit (requires login)
npm run run-a11y-local -- \
  --url "https://yourapp.com/login" \
  --username "test@example.com" \
  --password "testpassword" \
  --post-login-url "https://yourapp.com/dashboard"
```

### Cross-Browser Testing
```bash
# Test on different browsers via BrowserStack
npm run run-a11y-browserstack -- \
  --url "https://yoursite.com/login" \
  --username "user" \
  --password "pass" \
  --browser "firefox" \
  --os "OS X" \
  --os-version "12"

# Test on Safari
npm run run-a11y-browserstack -- \
  --url "https://yoursite.com/login" \
  --username "user" \
  --password "pass" \
  --browser "safari" \
  --os "OS X"
```

## Reports and Output

### Simple Test Reports
- **Console Output**: Immediate summary with violation count and details
- **JSON Report**: `simple-a11y-report-[timestamp].json` with complete results

**Example Console Output:**
```
🚀 Starting Simple Accessibility Test...
🎯 Target: https://www.google.com
💻 Starting local browser...
🌐 Loading https://www.google.com...
♿ Running accessibility scan...

📈 Test Summary:
🌐 URL tested: https://www.google.com
❌ Violations: 3
✅ Passes: 33
⚠️  Incomplete: 2

🔍 Violations found:
  1. [minor] aria-allowed-role: Ensure role attribute has an appropriate value
  2. [moderate] landmark-one-main: Ensure the document has a main landmark
  3. [moderate] page-has-heading-one: Ensure heading structure is correct

📊 JSON report saved to: simple-a11y-report-2025-06-04T03-36-08-201Z.json
✅ Test completed successfully!
```

### Comprehensive Test Reports
The framework generates two types of reports:
- **JSON Report**: `a11y-report-[timestamp].json` - Machine-readable format for CI/CD integration
- **HTML Report**: `a11y-report-[timestamp].html` - Human-readable format with styled violation details

**Report Timestamps Format**: `2025-06-04T12-00-00-000Z`

**Sample JSON Structure:**
```json
{
  "url": "https://example.com",
  "timestamp": "2025-06-04T12:00:00.000Z",
  "summary": {
    "violations": 3,
    "passes": 45,
    "incomplete": 1,
    "inapplicable": 20
  },
  "violations": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "description": "Elements must have sufficient color contrast",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
      "nodes": [...]
    }
  ]
}
```

### Understanding Accessibility Results

**Violation Levels:**
- 🔴 **Critical**: Major accessibility barriers
- 🟠 **Serious**: Significant issues affecting usability  
- 🟡 **Moderate**: Important improvements needed
- 🟢 **Minor**: Best practice recommendations

**Common Accessibility Issues:**
- Missing alt text on images
- Insufficient color contrast
- Missing form labels
- Improper heading structure
- Missing ARIA landmarks
- Keyboard navigation issues

## AI-Powered Testing with GitHub Copilot

### Setup MCP Integration
1. **VS Code Configuration**: Ensure `.vscode/mcp.json` is configured
2. **Restart VS Code** to load the MCP configuration
3. **BrowserStack Credentials**: Set in `.env` file

### Natural Language Commands
Use these prompts with GitHub Copilot in VS Code:
```
@github run accessibility tests on my website using BrowserStack
@github check my app for WCAG compliance issues  
@github test my login flow on Safari
@github debug my test failures on BrowserStack
@github test my website on iPhone 15 Pro Max
@github check for color contrast issues on my site
@github run accessibility audit on multiple browsers
```

## BrowserStack Integration

This framework integrates with BrowserStack in two ways:

### 1. Direct BrowserStack Integration (No MCP Required)
Run your accessibility tests directly on BrowserStack cloud infrastructure without any additional setup.

**Setup:**
1. Get BrowserStack credentials from your [Account Settings](https://www.browserstack.com/accounts/profile/details)
2. Set credentials in `.env` file or environment variables
3. Run tests with `--browserstack` flag

**Commands:**
```bash
# Run tests on BrowserStack cloud
npm run run-a11y-browserstack -- \
  --url "https://yoursite.com/login" \
  --username "user" \
  --password "pass" \
  --post-login-url "https://yoursite.com/dashboard"

# Run tests locally for development  
npm run run-a11y-local -- \
  --url "https://yoursite.com/login" \
  --username "user" \
  --password "pass" \
  --post-login-url "https://yoursite.com/dashboard"
```

**BrowserStack Configuration Options:**
- `--browser`: Browser type (chrome, firefox, safari, edge) - default: chrome
- `--os`: Operating System (Windows, OS X) - default: Windows  
- `--os-version`: OS version (11, 10, etc.) - default: 11

### 2. BrowserStack MCP Server (Optional - For AI-powered testing)
The BrowserStack MCP (Model Context Protocol) server enables you to use BrowserStack's testing platform directly through GitHub Copilot and other AI tools.

**Setup:**
1. **VS Code Configuration**: The `.vscode/mcp.json` file should be configured with your credentials
2. **Restart VS Code** to load the MCP configuration
3. **Use AI prompts** with GitHub Copilot (see AI-Powered Testing section above)

**MCP Server Management:**

**Start the MCP Server:**
```bash
# Start BrowserStack MCP server
npm run start-browserstack

# Alternative: Start manually
./start-browserstack-server.sh
```

**Check Server Status:**
```bash
# Check if MCP server is running
npm run check-server

# Alternative: Run the check script directly
./check-server.sh
```

**Sample Output - Server Running:**
```
🔍 Checking BrowserStack MCP Server Status...

✅ BrowserStack MCP server process is running
📊 Process details:
user    12345   0.1  0.5  123456  12345 ??     S     2:30PM   0:01.23 node browserstack-mcp-server

✅ Port 4545 is listening
📊 Port details:
COMMAND   PID  USER   FD   TYPE            DEVICE SIZE/OFF NODE NAME
node    12345  user   23u  IPv4 0x1234567890      0t0  TCP localhost:4545 (LISTEN)

🌐 Testing WebSocket connection to ws://localhost:4545/playwright...
✅ Server is responding on localhost:4545

📝 To start the server: npm run start-browserstack
📝 To stop the server: pkill -f browserstack-mcp-server
```

**Sample Output - Server Not Running:**
```
🔍 Checking BrowserStack MCP Server Status...

❌ BrowserStack MCP server process is NOT running

❌ Port 4545 is NOT listening

🌐 Testing WebSocket connection to ws://localhost:4545/playwright...
❌ Cannot connect to localhost:4545 - server may not be running

📝 To start the server: npm run start-browserstack
📝 To stop the server: pkill -f browserstack-mcp-server
```

**Stop the MCP Server:**
```bash
# Stop the MCP server process
pkill -f browserstack-mcp-server

# Verify it's stopped
npm run check-server
```

**Troubleshoot MCP Server:**
```bash
# Check MCP configuration
cat .vscode/mcp.json

# View server logs (if running in background)
ps aux | grep browserstack-mcp-server
```

### Browser and OS Support

**Supported Browsers:**
- Chrome (latest, specific versions)
- Firefox (latest, specific versions)
- Safari (macOS only)
- Edge (Windows only)
- Internet Explorer (Windows only)

**Supported Operating Systems:**
- Windows (10, 11)
- macOS (Monterey, Ventura, Sonoma)
- iOS (for mobile testing)
- Android (for mobile testing)

**Example Cross-Platform Tests:**
```bash
# Windows 11 + Chrome
npm run run-a11y-browserstack -- --os "Windows" --os-version "11" --browser "chrome"

# macOS + Safari  
npm run run-a11y-browserstack -- --os "OS X" --os-version "Sonoma" --browser "safari"

# Windows 10 + Firefox
npm run run-a11y-browserstack -- --os "Windows" --os-version "10" --browser "firefox"
```

## Local vs BrowserStack Testing

### Local Testing (Recommended for Development)
**Pros:**
- ✅ Fast execution (no network latency)
- ✅ No additional costs
- ✅ Good for development and debugging
- ✅ Works offline
- ✅ Immediate feedback

**Cons:**
- ❌ Limited to your local browser/OS
- ❌ May not catch cross-browser issues
- ❌ Local environment differences

**Use Cases:**
- Development and debugging
- Quick accessibility checks
- CI/CD pipeline testing
- Cost-effective testing

### BrowserStack Testing (Recommended for Production)
**Pros:**
- ✅ Real devices and browsers in the cloud
- ✅ Cross-platform testing capabilities
- ✅ Latest browser versions
- ✅ Historical browser versions
- ✅ Mobile device testing

**Cons:**
- ❌ Slower execution due to network latency
- ❌ Requires BrowserStack subscription
- ❌ Internet connection required
- ❌ Limited parallel sessions (plan dependent)

**Use Cases:**
- Comprehensive testing before release
- Cross-browser compatibility verification
- Mobile accessibility testing
- Client reporting and compliance

## Configuration and Customization

### Login Selectors Customization
The framework uses CSS selectors to find login elements. Default selectors work for most websites, but you can customize them in `src/main.ts`:

```typescript
const loginConfig = {
  loginUrl: getArg('--url', 'https://example.com/login'),
  usernameSelector: 'input[name="username"]',     // Customize this
  passwordSelector: 'input[name="password"]',     // Customize this  
  submitSelector: 'button[type="submit"]',        // Customize this
  username: getArg('--username', 'your-username'),
  password: getArg('--password', 'your-password'),
  postLoginUrl: getArg('--post-login-url', 'https://example.com/dashboard'),
};
```

**Common Selector Patterns:**
```typescript
// Email field variations
usernameSelector: 'input[type="email"]'
usernameSelector: '#email'
usernameSelector: '.login-email'

// Password field variations  
passwordSelector: 'input[type="password"]'
passwordSelector: '#password'
passwordSelector: '.login-password'

// Submit button variations
submitSelector: 'input[type="submit"]'
submitSelector: '#login-button'
submitSelector: '.btn-login'
```

### Browser Configuration
Modify browser settings in `src/main.ts`:

```typescript
// Local browser configuration
async function connectToLocalBrowser(): Promise<Browser> {
  return chromium.launch({ 
    headless: false,           // Set to true for headless mode
    slowMo: 100,              // Add delay between actions
    args: [
      '--no-sandbox', 
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'  // Set window size
    ]
  });
}
```

### Accessibility Rules Configuration
Customize axe-core rules in both test files:

```typescript
// Include specific rules only
const results = await new AxeBuilder({ page })
  .include('.main-content')
  .exclude('.advertisement')
  .withTags(['wcag2a', 'wcag2aa'])
  .analyze();

// Disable specific rules
const results = await new AxeBuilder({ page })
  .disableRules(['color-contrast'])
  .analyze();
```

## Troubleshooting

### Common Issues and Solutions

#### 1. **Installation Issues**

**Node.js not found:**
```bash
# Verify Node.js installation
node --version
npm --version

# If not installed, download from nodejs.org
```

**Permission errors (macOS/Linux):**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

**PowerShell execution policy (Windows):**
```powershell
# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2. **Playwright Issues**

**Browser not installed:**
```bash
# Install Playwright browsers
npx playwright install

# Install specific browser
npx playwright install chromium
```

**Headless mode issues:**
```typescript
// In src/simple-test.ts, change headless setting
browser = await chromium.launch({ 
  headless: false,  // Change to false to see browser
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
```

#### 3. **BrowserStack Connection Issues**

**🚨 WebSocket Close Code 1006 Error (CRITICAL)**

This is the most common BrowserStack error - here's how to fix it:

**Symptoms:**
```
WebSocket is already in CLOSING or CLOSED state
Execution context was destroyed, most likely because of a navigation.
```

**Root Causes & Solutions:**

1. **Plan Limitations (Most Common)**
   ```bash
   # Check your BrowserStack plan
   curl -u "USERNAME:ACCESS_KEY" https://api.browserstack.com/automate/plan.json
   
   # Verify CDP (Chrome DevTools Protocol) access
   # CDP often requires paid plans
   ```

2. **Alternative Testing Methods:**
   ```bash
   # Use local testing (recommended for development)
   npm run simple-test -- --url "https://your-site.com"
   
   # Use enhanced local testing for comprehensive analysis
   npm run test-enhanced-local -- --url "https://your-site.com"
   ```

3. **BrowserStack Plan Verification:**
   - ✅ Free plans: Limited browser access, no CDP
   - ✅ Live plans: Manual testing only
   - ✅ Automate plans: WebDriver support
   - ✅ Automate Pro: Full CDP access

**Quick Fix - Use Local Testing:**
```bash
# This always works and is faster for development
npm run simple-test -- --url "https://example.com"
```

**Enhanced Local Testing:**
```bash
# Comprehensive local testing with login support
npm run test-enhanced-local -- --url "https://example.com"
```

**WebSocket connection errors:**
1. Verify credentials in `.env` file
2. Check your BrowserStack plan supports Playwright
3. Ensure you have active parallel sessions available
4. Check network connectivity

```bash
# Test BrowserStack credentials
curl -u "USERNAME:ACCESS_KEY" https://api.browserstack.com/automate/plan.json
```

**Plan limitations:**
- Free plans may not support Playwright
- Check parallel session limits
- Verify advanced features availability

#### 4. **MCP Server Issues**

**MCP Server not starting:**
```bash
# Check if port 4545 is already in use
lsof -i :4545

# Kill existing process if needed
pkill -f browserstack-mcp-server

# Start server with verbose logging
./start-browserstack-server.sh
```

**MCP Server status checking:**
```bash
# Quick status check
npm run check-server

# Manual status verification
./check-server.sh
```

**Sample troubleshooting workflow:**
```bash
# Step 1: Check current status
npm run check-server

# Step 2: Stop any existing server
pkill -f browserstack-mcp-server

# Step 3: Start fresh server
npm run start-browserstack

# Step 4: Verify it's running
npm run check-server

# Step 5: Test connection
npm run test-connection
```

**Common MCP Server Issues:**

**Port 4545 already in use:**
```bash
# Find what's using the port
lsof -i :4545

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or kill all browserstack-mcp-server processes
pkill -f browserstack-mcp-server
```

**Server starts but WebSocket connection fails:**
```bash
# Check if server is listening correctly
netstat -an | grep 4545

# Test connection manually
curl -I http://localhost:4545

# Check firewall settings (macOS)
sudo pfctl -sr | grep 4545
```

**Environment variable issues:**
```bash
# Verify BrowserStack credentials are set
echo $BROWSERSTACK_USERNAME
echo $BROWSERSTACK_ACCESS_KEY

# Check .env file
cat .env

# Test credentials directly
curl -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" https://api.browserstack.com/automate/plan.json
```

#### 5. **Login Issues**

**Login fails:**
1. Check if login selectors match your target website:
```bash
# Run in non-headless mode to debug
# Modify src/main.ts: headless: false
```

2. Verify credentials are correct
3. Check for additional login steps:
   - CAPTCHA verification
   - Two-factor authentication
   - Email verification

**Selector debugging:**
```typescript
// Add debugging in src/main.ts
await page.screenshot({ path: 'debug-login.png' });
console.log('Page title:', await page.title());
```

#### 6. **Network and Timeout Issues**

**Page load timeouts:**
```typescript
// Increase timeout in src/simple-test.ts
await page.goto(TARGET_URL, { 
  waitUntil: 'domcontentloaded', 
  timeout: 30000  // Increase to 30 seconds
});
```

**Slow network connections:**
```typescript
// Add longer waits
await page.waitForLoadState('networkidle');
```

#### 7. **Report Generation Issues**

**Permission denied writing reports:**
```bash
# Check current directory permissions
ls -la

# Create reports directory
mkdir reports
```

**Large report files:**
- Limit pages crawled
- Use simple-test for single pages
- Filter out unnecessary content

### Platform-Specific Troubleshooting

#### macOS Issues
```bash
# Xcode command line tools
xcode-select --install

# Rosetta 2 for M1 Macs
softwareupdate --install-rosetta
```

#### Windows Issues
```cmd
REM Windows Defender exclusions
REM Add project folder to Windows Defender exclusions

REM Long path support
REM Enable in Group Policy or Registry
```

#### Linux Issues
```bash
# Install dependencies for Playwright
sudo apt-get install libnss3-dev libatk-bridge2.0-dev libxss1 libasound2-dev

# For Ubuntu/Debian
sudo apt-get install libgconf-2-4 libxss1 libxtst6 libxrandr2 libasound2-dev libpangocairo-1.0-0 libatk1.0-dev libcairo-gobject2 libgtk-3-dev libgdk-pixbuf2.0-dev
```

### Debug Mode

**Enable verbose logging:**
```bash
# Set debug environment variable
export DEBUG=pw:api

# Run test with debug output
npm run simple-test -- --url "https://example.com"
```

**Screenshot debugging:**
```typescript
// Add to src/simple-test.ts before analyze()
await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
```

### Getting Help

1. **Check the logs**: Look for specific error messages
2. **Enable debug mode**: Use non-headless browser to see what's happening
3. **Test with simple sites**: Start with simple public websites
4. **Check BrowserStack dashboard**: For cloud testing issues
5. **Verify environment**: Ensure all dependencies are installed

**Support Resources:**
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [BrowserStack Documentation](https://www.browserstack.com/docs)
- [Node.js Documentation](https://nodejs.org/en/docs/)

### Error Code Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Network connection failed | Check internet connection, verify URLs |
| `TimeoutError` | Page load timeout | Increase timeout values, check site availability |
| `ProtocolError` | Browser communication issue | Restart test, check browser installation |
| `WebSocket connection failed` | BrowserStack connection issue | Verify credentials, check plan limits |

## Quick Reference

### Essential Commands

**Quick Testing:**
```bash
# Test any website immediately
npm run simple-test -- --url "https://example.com"

# Test with login and crawling (local)
npm run run-a11y-local -- --url "https://site.com/login" --username "user" --password "pass"

# Test with BrowserStack
npm run test-browserstack -- --url "https://example.com"
```

**MCP Server Management:**
```bash
# Start MCP server
npm run start-browserstack

# Check server status
npm run check-server

# Stop MCP server
pkill -f browserstack-mcp-server
```

**Troubleshooting:**
```bash
# Test BrowserStack connection
npm run test-connection

# Use enhanced local testing for comprehensive analysis
npm run test-enhanced-local -- --url "https://example.com"
```

**Development Workflow:**
```bash
# 1. Install dependencies
npm install && npx playwright install

# 2. Set up environment
cp .env.example .env  # Add your BrowserStack credentials

# 3. Test locally first
npm run simple-test -- --url "https://your-site.com"

# 4. Test with BrowserStack (optional)
npm run test-browserstack -- --url "https://your-site.com"

# 5. Start MCP server for AI features (optional)
npm run start-browserstack
npm run check-server
```

## Project Structure
```
a11y-test-mate/
├── src/
│   ├── main.ts                          # Comprehensive testing framework with login/crawling
│   ├── simple-test.ts                   # Single page accessibility testing
│   ├── test-connection.ts               # BrowserStack connection testing
│   ├── enhanced-local-cli.ts            # Enhanced local testing CLI
│   ├── enhanced-local-selenium.ts       # Enhanced local testing implementation
│   ├── enhanced-browserstack-cli.ts     # Enhanced BrowserStack testing CLI
│   ├── enhanced-browserstack-selenium.ts# Enhanced BrowserStack testing implementation
│   ├── browserstack-cli.ts             # Basic BrowserStack CLI
│   ├── browserstack-selenium.ts        # Basic BrowserStack implementation
│   └── browserstack-webdriver.ts       # BrowserStack WebDriver utilities
├── .vscode/
│   ├── mcp.json                         # VS Code MCP server configuration
│   └── tasks.json                       # VS Code task definitions
├── .env                                 # Environment variables (BrowserStack credentials)
├── .gitignore                           # Git ignore patterns
├── package.json                         # Node.js dependencies and scripts
├── tsconfig.json                        # TypeScript configuration
├── README.md                            # This documentation
├── start-browserstack-server.sh        # Script to start BrowserStack MCP server
├── check-server.sh                     # Script to check server status
└── reports/                            # Generated accessibility reports (created automatically)
    ├── simple-a11y-report-*.json
    ├── a11y-report-*.json
    └── a11y-report-*.html
```

### Key Files Explained

| File | Purpose | When to Modify |
|------|---------|----------------|
| `src/main.ts` | Full-featured testing with login | Customize login selectors, add new features |
| `src/simple-test.ts` | Quick single-page testing | Modify for specific testing needs |
| `src/enhanced-local-cli.ts` | Enhanced local testing CLI | Add new local testing options |
| `src/enhanced-browserstack-cli.ts` | Enhanced BrowserStack testing CLI | Add new cloud testing options |
| `src/test-connection.ts` | BrowserStack connection testing | Modify connection diagnostics |
| `.env` | Store BrowserStack credentials | Add your credentials |
| `package.json` | Project dependencies and scripts | Add new dependencies |
| `tsconfig.json` | TypeScript compilation settings | Modify TypeScript options |
| `.vscode/mcp.json` | MCP server configuration | Update BrowserStack settings |

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/accessibility.yml`:

```yaml
name: Accessibility Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        npx playwright install --with-deps
    
    - name: Run accessibility tests
      run: |
        npm run simple-test -- --url "https://your-staging-site.com"
    
    - name: Upload accessibility reports
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: accessibility-reports
        path: simple-a11y-report-*.json
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    
    tools {
        nodejs "nodejs-18"
    }
    
    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }
        
        stage('Accessibility Tests') {
            steps {
                sh 'npm run simple-test -- --url "https://your-site.com"'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'simple-a11y-report-*.json', fingerprint: true
                }
            }
        }
    }
}
```

### Docker Integration

Create `Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

CMD ["npm", "run", "simple-test", "--", "--url", "https://example.com"]
```

Build and run:
```bash
docker build -t a11y-test-mate .
docker run -v $(pwd)/reports:/app/reports a11y-test-mate
```

## Advanced Usage

### Batch Testing Multiple Sites

Create a script to test multiple websites:

```bash
#!/bin/bash
# batch-test.sh

sites=(
  "https://www.google.com"
  "https://github.com"
  "https://stackoverflow.com"
  "https://www.wikipedia.org"
)

for site in "${sites[@]}"; do
  echo "Testing $site..."
  npm run simple-test -- --url "$site"
  echo "Completed $site"
  echo "---"
done
```

### Custom Test Rules

Create a custom configuration file `accessibility-config.js`:

```javascript
module.exports = {
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'aria-labels': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  exclude: ['.advertisement', '.third-party-widget']
};
```

### Performance Monitoring

Add performance metrics to your tests:

```typescript
// Add to src/simple-test.ts
const startTime = Date.now();
// ... run tests ...
const endTime = Date.now();
console.log(`Test completed in ${endTime - startTime}ms`);
```

### Scheduled Testing

Set up cron jobs for regular accessibility monitoring:

```bash
# Run accessibility tests daily at 2 AM
0 2 * * * cd /path/to/a11y-test-mate && npm run simple-test -- --url "https://yoursite.com" >> /var/log/accessibility.log 2>&1
```

## Contributing

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Make your changes
5. Run tests: `npm run build`
6. Submit a pull request

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex logic
- Update documentation for new features

### Testing Your Changes
```bash
# Build the project
npm run build

# Test with a simple site
npm run simple-test -- --url "https://example.com"

# Test comprehensive features
npm run run-a11y-local -- --url "https://httpbin.org/forms/post" --username "test" --password "test"
```

## License

This project is licensed under the ISC License. See the LICENSE file for details.

## Changelog

### v1.1.0 (Current)
- ✅ **Project cleanup**: Removed temporary and debug files
- ✅ **Streamlined structure**: Focus on core framework functionality
- ✅ **Enhanced documentation**: Updated README to reflect current state
- ✅ **Improved reliability**: Stable testing scripts and clear error handling
- ✅ **Multiple testing approaches**: Simple, enhanced local, and BrowserStack options

### v1.0.0
- Initial release
- Simple and comprehensive testing modes
- BrowserStack integration
- JSON and HTML report generation
- Cross-platform support
- MCP server integration

## ✅ Framework Status

**Current Status: Production Ready** 

- ✅ **Core functionality verified** - All testing modes working
- ✅ **Clean codebase** - Removed temporary and debug files  
- ✅ **Updated documentation** - README reflects current state
- ✅ **All npm scripts functional** - Verified working commands
- ✅ **Cross-platform compatibility** - macOS, Windows, Linux support
- ✅ **Multiple testing approaches** - Simple, enhanced, and cloud options

### 🎯 **Recommended Usage**

**For Quick Testing:**
```bash
npm run simple-test -- --url "https://your-website.com"
```

**For Comprehensive Testing:**
```bash
npm run test-enhanced-local -- --url "https://your-website.com"
```

**For Cloud Testing:**
```bash
npm run test-enhanced-browserstack -- --url "https://your-website.com"
```

---

**Happy Testing! 🎉**

For questions, issues, or contributions, please visit our GitHub repository or contact the maintainers.
