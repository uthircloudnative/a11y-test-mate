import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import { AxeBuilder } from '@axe-core/webdriverjs';
import * as fs from 'fs';
import * as path from 'path';

interface EnhancedBrowserStackConfig {
  username: string;
  accessKey: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  projectName?: string;
  buildName?: string;
  sessionName?: string;
  // New: Login configuration
  loginConfig?: {
    loginUrl: string;
    usernameSelector: string;
    passwordSelector: string;
    submitSelector: string;
    username: string;
    password: string;
    postLoginUrl?: string;
  };
}

interface A11yTestResult {
  url: string;
  violations: any[];
  passes: any[];
  incomplete: any[];
  timestamp: string;
  browserInfo: string;
  success: boolean;
  error?: string;
  accessibilityScore?: number;
  accessibilityGrade?: { grade: string; color: string; description: string };
}

/**
 * Enhanced BrowserStack Accessibility Tester with Login & Crawling
 * Works with Free BrowserStack plans using Selenium WebDriver
 */
export class EnhancedBrowserStackA11yTester {
  private config: EnhancedBrowserStackConfig;
  private driver?: WebDriver;

  constructor(config: EnhancedBrowserStackConfig) {
    this.config = {
      browser: 'chrome',
      browserVersion: 'latest',
      os: 'WINDOWS',
      osVersion: '10',
      projectName: 'Enhanced A11y Testing',
      buildName: `Enhanced A11y Test ${new Date().toISOString()}`,
      sessionName: 'Enhanced Accessibility Scan with Login & Crawling',
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
   * Connect to BrowserStack using Selenium WebDriver
   */
  async connect(): Promise<void> {
    console.log('🔗 Connecting to Enhanced BrowserStack Tester...');
    console.log(`📋 Browser: ${this.config.browser} | OS: ${this.config.os}`);

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
      
      const sessionId = await this.driver.getSession();
      console.log(`🔗 Session ID: ${sessionId.getId()}`);
      
    } catch (error) {
      console.error('❌ BrowserStack connection failed:', error);
      throw new Error(`BrowserStack connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find element using multiple detection strategies with enhanced intelligence
   */
  private async findElementByMultipleStrategies(providedSelectors: string[], elementType: string): Promise<any> {
    if (!this.driver) {
      throw new Error('Driver not connected');
    }

    // Start with user-provided selectors if any
    if (providedSelectors && providedSelectors.length > 0) {
      for (const selector of providedSelectors) {
        try {
          const element = await this.driver.findElement(By.css(selector));
          const isValid = await this.validateElement(element, { isVisible: true });
          if (isValid) {
            console.log(`✅ Found ${elementType} using provided selector: ${selector}`);
            return element;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }

    // Enhanced: Try to find all potential elements and rank them
    console.log(`🤖 Using intelligent detection for ${elementType}...`);
    const candidateElements = await this.findCandidateElements(elementType);
    
    if (candidateElements.length > 0) {
      // Return the best ranked candidate
      const bestElement = candidateElements[0];
      console.log(`✅ Found ${elementType} using intelligent ranking: ${bestElement.strategy}`);
      return bestElement.element;
    }

    // Fall back to XPath strategies for text-based detection
    console.log(`🔍 Using XPath detection for ${elementType}...`);
    const xpathStrategies = this.getXPathStrategies(elementType);
    
    for (const xpath of xpathStrategies) {
      try {
        const element = await this.driver.findElement(By.xpath(xpath));
        const isValid = await this.validateElement(element, { isVisible: true, isEnabled: true });
        if (isValid) {
          console.log(`✅ Found ${elementType} using XPath: ${xpath}`);
          return element;
        }
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Enhanced: Try generic form field detection as last resort
    console.log(`🔍 Using generic form field detection for ${elementType}...`);
    const genericElement = await this.findGenericFormField(elementType);
    if (genericElement) {
      console.log(`✅ Found ${elementType} using generic detection`);
      return genericElement;
    }

    throw new Error(`Could not find ${elementType} field using any detection strategy`);
  }

  /**
   * Find and rank candidate elements based on multiple criteria
   */
  private async findCandidateElements(elementType: string): Promise<Array<{element: any, score: number, strategy: string}>> {
    const candidates: Array<{element: any, score: number, strategy: string}> = [];
    const smartStrategies = this.getSmartStrategies(elementType);
    
    for (const strategy of smartStrategies) {
      try {
        const elements = await this.driver!.findElements(By.css(strategy.selector));
        
        for (const element of elements) {
          const isValid = await this.validateElement(element, strategy.validation);
          if (isValid) {
            const score = await this.scoreElement(element, elementType, strategy.selector);
            candidates.push({
              element,
              score,
              strategy: strategy.selector
            });
          }
        }
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Sort by score (highest first)
    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Score an element based on various criteria to determine best match
   */
  private async scoreElement(element: any, elementType: string, selector: string): Promise<number> {
    let score = 0;

    try {
      // Base score for being found
      score += 10;

      // Higher score for specific selectors
      if (selector.includes('type=')) score += 20;
      if (selector.includes('name')) score += 15;
      if (selector.includes('id')) score += 15;

      // Check position (prefer first relevant field)
      const allInputs = await this.driver!.findElements(By.css('input'));
      const elementIndex = allInputs.findIndex(async (el) => {
        try {
          return await this.driver!.executeScript('return arguments[0] === arguments[1]', el, element);
        } catch {
          return false;
        }
      });

      if (elementType === 'username' && elementIndex <= 1) score += 10;
      if (elementType === 'password' && elementIndex <= 2) score += 10;

      // Check for associated labels
      try {
        const label = await this.driver!.executeScript(`
          const element = arguments[0];
          const id = element.id;
          if (id) {
            const label = document.querySelector('label[for="' + id + '"]');
            if (label) return label.textContent.toLowerCase();
          }
          return '';
        `, element) as string;

        if (label && typeof label === 'string') {
          score += 5;
          if (elementType === 'username' && (label.includes('user') || label.includes('email'))) score += 10;
          if (elementType === 'password' && label.includes('pass')) score += 10;
          if (elementType === 'submit' && (label.includes('login') || label.includes('sign'))) score += 10;
        }
      } catch (e) {
        // Continue without label scoring
      }

      // Check placeholder text
      try {
        const placeholder = await element.getAttribute('placeholder');
        if (placeholder) {
          const placeholderLower = placeholder.toLowerCase();
          score += 5;
          if (elementType === 'username' && (placeholderLower.includes('user') || placeholderLower.includes('email'))) score += 10;
          if (elementType === 'password' && placeholderLower.includes('pass')) score += 10;
        }
      } catch (e) {
        // Continue without placeholder scoring
      }

      // Check element size (prefer reasonable sized elements)
      try {
        const size = await element.getSize();
        if (size.width > 50 && size.height > 20) score += 5;
      } catch (e) {
        // Continue without size scoring
      }

    } catch (error) {
      // Element might be stale, return low score
      return 1;
    }

    return score;
  }

  /**
   * Find generic form fields as last resort
   */
  private async findGenericFormField(elementType: string): Promise<any> {
    try {
      switch (elementType) {
        case 'username':
          // Try first text/email input
          const textInputs = await this.driver!.findElements(By.css('input[type="text"], input[type="email"], input:not([type])'));
          for (const input of textInputs) {
            const isValid = await this.validateElement(input, { isVisible: true, isEnabled: true });
            if (isValid) return input;
          }
          break;

        case 'password':
          // Try any password input
          const passwordInputs = await this.driver!.findElements(By.css('input[type="password"]'));
          for (const input of passwordInputs) {
            const isValid = await this.validateElement(input, { isVisible: true, isEnabled: true });
            if (isValid) return input;
          }
          break;

        case 'submit':
          // Try any submit button or form button
          const buttons = await this.driver!.findElements(By.css('button, input[type="submit"], input[type="button"]'));
          for (const button of buttons) {
            const isValid = await this.validateElement(button, { isVisible: true, isEnabled: true });
            if (isValid) return button;
          }
          break;
      }
    } catch (e) {
      // Return null if nothing found
    }
    return null;
  }

  /**
   * Get smart CSS strategies for different element types with enhanced patterns
   */
  private getSmartStrategies(elementType: string): Array<{selector: string, validation: {isVisible?: boolean, isEnabled?: boolean}}> {
    switch (elementType) {
      case 'username':
        return [
          // High priority: specific input types
          { selector: 'input[type="email"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[autocomplete="username"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[autocomplete="email"]', validation: { isVisible: true, isEnabled: true } },
          
          // Medium priority: name/id attributes
          { selector: 'input[name="username"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[name="email"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[name="login"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[id="username"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[id="email"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[id="login"]', validation: { isVisible: true, isEnabled: true } },
          
          // Lower priority: partial matches
          { selector: 'input[name*="user"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[name*="email"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[id*="user"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[id*="email"]', validation: { isVisible: true, isEnabled: true } },
          
          // Placeholder-based detection
          { selector: 'input[placeholder*="username" i]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[placeholder*="email" i]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[placeholder*="user" i]', validation: { isVisible: true, isEnabled: true } },
          
          // Generic fallbacks
          { selector: 'input[type="text"]:first-of-type', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input:not([type]):first-of-type', validation: { isVisible: true, isEnabled: true } }
        ];
        
      case 'password':
        return [
          // High priority: password type
          { selector: 'input[type="password"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[autocomplete="current-password"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[autocomplete="password"]', validation: { isVisible: true, isEnabled: true } },
          
          // Medium priority: name/id attributes
          { selector: 'input[name="password"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[id="password"]', validation: { isVisible: true, isEnabled: true } },
          
          // Lower priority: partial matches
          { selector: 'input[name*="pass"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[id*="pass"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[placeholder*="password" i]', validation: { isVisible: true, isEnabled: true } }
        ];
        
      case 'submit':
        return [
          // High priority: explicit submit types
          { selector: 'button[type="submit"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'input[type="submit"]', validation: { isVisible: true, isEnabled: true } },
          
          // Medium priority: common button text patterns
          { selector: 'button:contains("Login")', validation: { isVisible: true, isEnabled: true } },
          { selector: 'button:contains("Sign in")', validation: { isVisible: true, isEnabled: true } },
          { selector: 'button:contains("Log in")', validation: { isVisible: true, isEnabled: true } },
          { selector: 'button:contains("Submit")', validation: { isVisible: true, isEnabled: true } },
          
          // Lower priority: class/id based
          { selector: 'button[class*="login"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'button[class*="signin"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'button[class*="submit"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'button[id*="login"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'button[id*="signin"]', validation: { isVisible: true, isEnabled: true } },
          { selector: 'button[id*="submit"]', validation: { isVisible: true, isEnabled: true } },
          
          // Generic fallbacks
          { selector: 'form button:last-of-type', validation: { isVisible: true, isEnabled: true } },
          { selector: 'form input[type="button"]', validation: { isVisible: true, isEnabled: true } }
        ];
        
      default:
        return [];
    }
  }

  /**
   * Get enhanced XPath strategies for text-based detection
   */
  private getXPathStrategies(elementType: string): string[] {
    switch (elementType) {
      case 'username':
        return [
          // Placeholder text detection (case-insensitive)
          "//input[@placeholder[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'username')]]",
          "//input[@placeholder[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'email')]]",
          "//input[@placeholder[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'user')]]",
          "//input[@placeholder[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'login')]]",
          
          // Label association detection
          "//input[preceding-sibling::label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'username')]]",
          "//input[preceding-sibling::label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'email')]]",
          "//input[preceding-sibling::label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'user')]]",
          "//input[following-sibling::label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'username')]]",
          "//input[following-sibling::label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'email')]]",
          
          // Parent element text detection
          "//input[parent::*/label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'username')]]",
          "//input[parent::*/label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'email')]]",
          
          // First text-like input
          "//input[@type='text'][1]",
          "//input[@type='email'][1]",
          "//input[not(@type)][1]"
        ];
        
      case 'password':
        return [
          // Password type is most reliable
          "//input[@type='password']",
          
          // Placeholder detection
          "//input[@placeholder[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'password')]]",
          "//input[@placeholder[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'pass')]]",
          
          // Label association
          "//input[preceding-sibling::label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'password')]]",
          "//input[following-sibling::label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'password')]]",
          "//input[parent::*/label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'password')]]"
        ];
        
      case 'submit':
        return [
          // Button text detection (multiple variations)
          "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'login')]",
          "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sign in')]",
          "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'log in')]",
          "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'submit')]",
          "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'enter')]",
          "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'continue')]",
          
          // Input submit types
          "//input[@type='submit']",
          "//input[@type='button'][@value[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'login')]]",
          "//input[@type='button'][@value[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'submit')]]",
          
          // Form submission button (last button in form)
          "//form//button[last()]",
          
          // Button with specific types
          "//button[@type='submit']"
        ];
        
      default:
        return [];
    }
  }

  /**
   * Validate element meets criteria with enhanced checks
   */
  private async validateElement(element: any, validation: {isVisible?: boolean, isEnabled?: boolean}): Promise<boolean> {
    try {
      if (validation.isVisible !== undefined && validation.isVisible) {
        const isDisplayed = await element.isDisplayed();
        if (!isDisplayed) return false;
      }
      
      if (validation.isEnabled !== undefined && validation.isEnabled) {
        const isEnabled = await element.isEnabled();
        if (!isEnabled) return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Perform automated login with intelligent element detection
   */
  async login(): Promise<{ success: boolean; currentUrl?: string }> {
    if (!this.driver || !this.config.loginConfig) {
      throw new Error('Driver not connected or login config not provided');
    }

    const { loginUrl, usernameSelector, passwordSelector, submitSelector, username, password, postLoginUrl } = this.config.loginConfig;

    console.log('🔐 Performing intelligent automated login...');
    console.log(`   Login URL: ${loginUrl}`);

    try {
      // Navigate to login page
      await this.driver.get(loginUrl);
      
      // Wait for dynamic content to load with intelligent timeout
      console.log('⏳ Waiting for dynamic content to load...');
      await this.waitForDynamicContent();
      console.log('✅ Dynamic content loaded, proceeding with login...');

      // Prepare selector strategies (user-provided first, then smart detection)
      const usernameStrategies = usernameSelector ? [usernameSelector] : [];
      const passwordStrategies = passwordSelector ? [passwordSelector] : [];
      const submitStrategies = submitSelector ? [submitSelector] : [];

      // Find and fill username field
      console.log('🔍 Finding username field...');
      const usernameElement = await this.findElementByMultipleStrategies(usernameStrategies, 'username');
      await usernameElement.clear();
      await usernameElement.sendKeys(username);
      console.log('✅ Username entered successfully');

      // Small delay between fields
      await this.driver.sleep(1000);

      // Find and fill password field
      console.log('🔍 Finding password field...');
      const passwordElement = await this.findElementByMultipleStrategies(passwordStrategies, 'password');
      await passwordElement.clear();
      await passwordElement.sendKeys(password);
      console.log('✅ Password entered successfully');

      // Small delay before submit
      await this.driver.sleep(1000);

      // Find and click submit button
      console.log('🔍 Finding submit button...');
      const submitElement = await this.findElementByMultipleStrategies(submitStrategies, 'submit');
      await submitElement.click();
      console.log('✅ Submit button clicked');

      // Wait for navigation with longer timeout
      console.log('⏳ Waiting for login to complete...');
      await this.driver.sleep(5000);

      // Get current URL after login
      const currentUrl = await this.driver.getCurrentUrl();

      // Verify login success using multiple criteria
      const loginSuccessful = await this.verifyLoginSuccess(loginUrl, postLoginUrl);

      if (loginSuccessful) {
        console.log('✅ Login successful - proceeding with accessibility testing');
        return { success: true, currentUrl };
      } else {
        console.log('❌ Login may have failed - unable to verify success');
        // Take screenshot for debugging
        try {
          const screenshot = await this.driver.takeScreenshot();
          console.log('📸 Screenshot taken for debugging');
        } catch (e) {
          // Screenshot failed, continue
        }
        return { success: false, currentUrl };
      }

    } catch (error) {
      console.error('❌ Login failed:', error);
      console.log('💡 Try providing more specific selectors or check the login page structure');
      return { success: false };
    }
  }

  /**
   * Enhanced login verification using multiple strategies
   */
  private async verifyLoginSuccess(loginUrl: string, postLoginUrl?: string): Promise<boolean> {
    if (!this.driver) return false;

    try {
      const currentUrl = await this.driver.getCurrentUrl();
      console.log(`🔍 Verifying login success. Current URL: ${currentUrl}`);

      // Wait for any potential redirects to complete
      await this.driver.sleep(2000);
      const finalUrl = await this.driver.getCurrentUrl();

      // Strategy 1: URL-based verification
      const urlVerification = await this.verifyUrlChange(loginUrl, postLoginUrl, finalUrl);
      
      // Strategy 2: DOM-based verification
      const domVerification = await this.verifyDomChanges();
      
      // Strategy 3: Content-based verification
      const contentVerification = await this.verifyPageContent();
      
      // Strategy 4: Form absence verification
      const formAbsenceVerification = await this.checkAbsenceOfLoginForm();

      console.log(`   URL verification: ${urlVerification.success} (${urlVerification.reason})`);
      console.log(`   DOM verification: ${domVerification.success} (${domVerification.reason})`);
      console.log(`   Content verification: ${contentVerification.success} (${contentVerification.reason})`);
      console.log(`   Form absence verification: ${formAbsenceVerification}`);

      // Enhanced logic: URL verification is primary indicator
      // If URL verification passes, that's typically sufficient for login success
      if (urlVerification.success) {
        console.log('✅ Login successful - URL verification passed (primary indicator)');
        return true;
      }

      // Otherwise, require 2 out of remaining 3 strategies to pass
      const successCount = [
        domVerification.success,
        contentVerification.success,
        formAbsenceVerification
      ].filter(Boolean).length;

      if (successCount >= 2) {
        console.log('✅ Login successful - multiple verification strategies passed');
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error verifying login success:', error);
      return false;
    }
  }

  /**
   * Verify URL changes indicate successful login
   */
  private async verifyUrlChange(loginUrl: string, postLoginUrl: string | undefined, currentUrl: string): Promise<{success: boolean, reason: string}> {
    try {
      const loginPath = new URL(loginUrl).pathname;
      const currentPath = new URL(currentUrl).pathname;
      const loginDomain = new URL(loginUrl).hostname;
      const currentDomain = new URL(currentUrl).hostname;
      
      // If we've been redirected to a different domain entirely, that's often a sign of successful login
      // (e.g., login.company.com -> app.company.com or OAuth redirects)
      if (currentDomain !== loginDomain) {
        return { success: true, reason: 'Redirected to different domain after login' };
      }
      
      // Check if redirected to the expected post-login URL
      if (postLoginUrl) {
        if (currentUrl.includes(postLoginUrl) || currentUrl === postLoginUrl) {
          return { success: true, reason: 'Redirected to expected post-login URL' };
        }
      }
      
      // Check if we've moved away from the login page path
      if (currentPath !== loginPath) {
        // Make sure we're not still on a login-related page
        if (!currentPath.includes('login') && !currentPath.includes('signin') && 
            !currentPath.includes('auth') && !currentPath.includes('register') &&
            !currentPath.includes('signup')) {
          return { success: true, reason: 'Navigated away from login page' };
        }
      }

      // Check for common post-login URL patterns that indicate successful login
      const postLoginPatterns = [
        '/dashboard', '/home', '/profile', '/account', '/welcome', '/main', 
        '/session', '/user', '/portal', '/app', '/admin', '/settings', '/overview'
      ];
      if (postLoginPatterns.some(pattern => currentPath.includes(pattern))) {
        return { success: true, reason: 'URL contains post-login pattern' };
      }

      // Check if URL changed at all (even small changes can indicate successful login)
      if (currentUrl !== loginUrl) {
        // Additional check: see if the URL just added query parameters or fragments
        // which can indicate a successful login state change
        const loginUrlBase = loginUrl.split('?')[0].split('#')[0];
        const currentUrlBase = currentUrl.split('?')[0].split('#')[0];
        
        if (loginUrlBase !== currentUrlBase) {
          return { success: true, reason: 'URL path changed after login attempt' };
        }
        
        // If only query params or hash changed, this might still indicate success
        if (currentUrl.includes('success') || currentUrl.includes('token') || 
            currentUrl.includes('authenticated') || currentUrl.includes('logged')) {
          return { success: true, reason: 'URL parameters suggest successful login' };
        }
      }

      return { success: false, reason: 'Still on login page or similar URL' };
    } catch (error) {
      return { success: false, reason: 'URL verification failed' };
    }
  }

  /**
   * Verify DOM changes indicate successful login
   */
  private async verifyDomChanges(): Promise<{success: boolean, reason: string}> {
    const hasLoggedInIndicators = await this.checkLoggedInIndicators();
    const hasUserElements = await this.checkUserElements();
    const hasNavigationChanges = await this.checkNavigationChanges();

    if (hasLoggedInIndicators) {
      return { success: true, reason: 'Found logout/user menu indicators' };
    }
    if (hasUserElements) {
      return { success: true, reason: 'Found user-specific elements' };
    }
    if (hasNavigationChanges) {
      return { success: true, reason: 'Navigation structure changed' };
    }

    return { success: false, reason: 'No DOM changes detected' };
  }

  /**
   * Verify page content indicates successful login
   */
  private async verifyPageContent(): Promise<{success: boolean, reason: string}> {
    try {
      const pageTitle = await this.driver!.getTitle();
      const bodyText = await this.driver!.findElement(By.css('body')).getText();
      
      // Check title for logged-in indicators
      const titleWords = pageTitle.toLowerCase();
      if (titleWords.includes('dashboard') || titleWords.includes('welcome') || 
          titleWords.includes('home') || titleWords.includes('profile')) {
        return { success: true, reason: 'Page title indicates logged-in state' };
      }

      // Check body text for welcome messages
      const bodyLower = bodyText.toLowerCase();
      const welcomePatterns = ['welcome', 'dashboard', 'logged in', 'signed in', 'my account'];
      if (welcomePatterns.some(pattern => bodyLower.includes(pattern))) {
        return { success: true, reason: 'Page content indicates successful login' };
      }

      // Check for absence of login-related text
      const loginPatterns = ['login', 'sign in', 'username', 'password'];
      const hasLoginText = loginPatterns.some(pattern => bodyLower.includes(pattern));
      if (!hasLoginText) {
        return { success: true, reason: 'No login-related text found on page' };
      }

      return { success: false, reason: 'Page content suggests still on login flow' };
    } catch (error) {
      return { success: false, reason: 'Content verification failed' };
    }
  }

  /**
   * Check for common indicators that user is logged in
   */
  private async checkLoggedInIndicators(): Promise<boolean> {
    if (!this.driver) return false;

    const indicators = [
      // Logout/signout links
      'a[href*="logout"]',
      'a[href*="signout"]',
      'a[href*="sign-out"]',
      'button[data-action*="logout"]',
      
      // User menus and profiles
      '.user-menu',
      '.profile-menu',
      '.account-menu',
      '[data-testid*="user"]',
      '[data-testid*="profile"]',
      '[data-testid*="account"]',
      
      // Avatar and user images
      '.avatar',
      '.user-avatar',
      '.profile-picture',
      'img[alt*="profile"]',
      'img[alt*="avatar"]',
      
      // Welcome messages
      '[class*="welcome"]',
      '[data-testid*="welcome"]'
    ];

    for (const indicator of indicators) {
      try {
        const elements = await this.driver.findElements(By.css(indicator));
        if (elements.length > 0) {
          console.log(`   Found login indicator: ${indicator}`);
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }

    return false;
  }

  /**
   * Check for user-specific elements
   */
  private async checkUserElements(): Promise<boolean> {
    if (!this.driver) return false;

    const userElementSelectors = [
      // User-specific content
      '[class*="username"]',
      '[class*="user-name"]',
      '[data-testid*="username"]',
      '.greeting',
      '[class*="greeting"]',
      
      // Account related
      '[href*="account"]',
      '[href*="profile"]',
      '[href*="settings"]',
      
      // Common dashboard elements
      '.dashboard',
      '[class*="dashboard"]',
      '.main-content',
      '.content-area'
    ];

    for (const selector of userElementSelectors) {
      try {
        const elements = await this.driver.findElements(By.css(selector));
        if (elements.length > 0) {
          console.log(`   Found user element: ${selector}`);
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }

    return false;
  }

  /**
   * Check for navigation changes that indicate login
   */
  private async checkNavigationChanges(): Promise<boolean> {
    if (!this.driver) return false;

    const navigationSelectors = [
      // Navigation that appears after login
      'nav[class*="main"]',
      'nav[class*="primary"]',
      '.main-nav',
      '.primary-nav',
      '.logged-in-nav',
      
      // Menu items that appear after login
      'a[href*="dashboard"]',
      'a[href*="account"]',
      'a[href*="profile"]',
      'a[href*="settings"]',
      'a[href*="logout"]'
    ];

    for (const selector of navigationSelectors) {
      try {
        const elements = await this.driver.findElements(By.css(selector));
        if (elements.length > 0) {
          console.log(`   Found navigation change: ${selector}`);
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }

    return false;
  }

  /**
   * Check if login form is no longer present
   */
  private async checkAbsenceOfLoginForm(): Promise<boolean> {
    if (!this.driver) return false;

    try {
      const passwordFields = await this.driver.findElements(By.css('input[type="password"]'));
      return passwordFields.length === 0;
    } catch (e) {
      return true; // If we can't find password fields, assume form is gone
    }
  }

  /**
   * Discover internal links on current page
   */
  async getInternalLinks(baseUrl: string): Promise<string[]> {
    if (!this.driver) {
      throw new Error('Driver not connected');
    }

    try {
      const base = new URL(baseUrl);
      
      // Get all links on the page
      const linkElements = await this.driver.findElements(By.css('a[href]'));
      const links: string[] = [];

      for (const element of linkElements) {
        try {
          const href = await element.getAttribute('href');
          if (href) {
            const url = new URL(href, baseUrl);
            // Only include links from the same origin
            if (url.origin === base.origin) {
              links.push(url.href);
            }
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }

      // Remove duplicates
      const uniqueLinks = Array.from(new Set(links));
      console.log(`🔍 Discovered ${uniqueLinks.length} internal links`);
      
      return uniqueLinks;

    } catch (error) {
      console.error('❌ Failed to discover links:', error);
      return [];
    }
  }

  /**
   * Run accessibility test on current page
   */
  async testCurrentPage(): Promise<A11yTestResult> {
    if (!this.driver) {
      throw new Error('Driver not connected');
    }

    try {
      const url = await this.driver.getCurrentUrl();
      const title = await this.driver.getTitle();
      
      console.log(`🧪 Testing: ${url}`);
      console.log(`📄 Page: "${title}"`);

      // Run accessibility analysis
      const results = await new AxeBuilder(this.driver).analyze();
      
      const browserInfo = `${this.config.browser} ${this.config.browserVersion} on ${this.config.os} ${this.config.osVersion}`;
      
      // Calculate accessibility score and grade
      const accessibilityScore = this.calculateAccessibilityScore(results.violations);
      const accessibilityGrade = this.getAccessibilityGrade(accessibilityScore);
      
      console.log(`📊 Results:`);
      console.log(`   ❌ Violations: ${results.violations.length}`);
      console.log(`   ✅ Passes: ${results.passes.length}`);
      console.log(`   ⚠️  Incomplete: ${results.incomplete.length}`);
      console.log(`   📊 Score: ${accessibilityScore}/100 (${accessibilityGrade.grade})`);

      return {
        url,
        violations: results.violations,
        passes: results.passes,
        incomplete: results.incomplete,
        timestamp: new Date().toISOString(),
        browserInfo,
        success: true,
        accessibilityScore,
        accessibilityGrade
      };

    } catch (error) {
      const url = await this.driver?.getCurrentUrl() || 'unknown';
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
   * Crawl and test multiple pages with login
   */
  async crawlAndTest(startUrl: string, maxPages: number = 10): Promise<A11yTestResult[]> {
    if (!this.driver) {
      throw new Error('Driver not connected');
    }

    const results: A11yTestResult[] = [];
    const visited = new Set<string>();
    const queue: string[] = [];

    console.log(`🚀 Starting crawl and test from: ${startUrl}`);
    console.log(`📋 Max pages to test: ${maxPages}`);

    let crawlStartUrl = startUrl;

    // Perform login if configured
    if (this.config.loginConfig) {
      const loginResult = await this.login();
      if (!loginResult.success) {
        throw new Error('Login failed - cannot proceed with crawling');
      } else {
        // Determine the URL to start crawling from
        if (this.config.loginConfig.postLoginUrl && this.config.loginConfig.postLoginUrl !== 'https://example.com/dashboard') {
          crawlStartUrl = this.config.loginConfig.postLoginUrl;
          console.log(`📍 Using specified post-login URL: ${crawlStartUrl}`);
        } else if (loginResult.currentUrl) {
          crawlStartUrl = loginResult.currentUrl;
          console.log(`📍 Auto-detected post-login URL: ${crawlStartUrl}`);
        }
      }
    }

    // Navigate to the starting URL for crawling
    await this.driver.get(crawlStartUrl);

    // Test the starting page
    const firstResult = await this.testCurrentPage();
    results.push(firstResult);
    visited.add(firstResult.url);

    // Discover links for crawling
    const links = await this.getInternalLinks(crawlStartUrl);
    queue.push(...links.filter(link => !visited.has(link)));

    // Crawl additional pages
    while (queue.length > 0 && results.length < maxPages) {
      const nextUrl = queue.shift()!;
      
      if (visited.has(nextUrl)) continue;
      visited.add(nextUrl);

      try {
        console.log(`\n🌐 Navigating to: ${nextUrl}`);
        await this.driver.get(nextUrl);
        await this.driver.sleep(2000); // Wait for page load

        // Test the page
        const result = await this.testCurrentPage();
        results.push(result);

        // Discover more links if we haven't reached the limit
        if (results.length < maxPages) {
          const newLinks = await this.getInternalLinks(crawlStartUrl);
          queue.push(...newLinks.filter(link => !visited.has(link)));
        }

      } catch (error) {
        console.error(`❌ Failed to test ${nextUrl}:`, error);
        results.push({
          url: nextUrl,
          violations: [],
          passes: [],
          incomplete: [],
          timestamp: new Date().toISOString(),
          browserInfo: `${this.config.browser} ${this.config.browserVersion}`,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log(`\n📊 Crawling completed: ${results.length} pages tested`);
    return results;
  }

  /**
   * Generate comprehensive report in both JSON and HTML formats
   */
  generateReport(results: A11yTestResult[], outputPath?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFilename = outputPath || `enhanced-browserstack-a11y-report-${timestamp}.json`;
    const htmlFilename = `enhanced-browserstack-a11y-report-${timestamp}.html`;
    const jsonFullPath = path.resolve(jsonFilename);
    const htmlFullPath = path.resolve(htmlFilename);

    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    // Calculate overall accessibility score
    const overallScore = successfulResults.length > 0 
      ? Math.round(successfulResults.reduce((sum, result) => sum + (result.accessibilityScore || 0), 0) / successfulResults.length)
      : 0;
    const overallGrade = this.getAccessibilityGrade(overallScore);

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
        generatedAt: new Date().toISOString(),
        loginUsed: !!this.config.loginConfig,
        overallAccessibilityScore: overallScore,
        overallAccessibilityGrade: overallGrade
      },
      browserStackInfo: {
        plan: 'Free',
        method: 'Enhanced Selenium WebDriver',
        features: ['Login Support', 'Page Crawling', 'Multi-page Testing']
      },
      loginConfig: this.config.loginConfig ? {
        loginUrl: this.config.loginConfig.loginUrl,
        postLoginUrl: this.config.loginConfig.postLoginUrl,
        username: this.config.loginConfig.username
      } : null,
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

    // Generate JSON report
    fs.writeFileSync(jsonFullPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlContent = this.generateHtmlReport(results, report);
    fs.writeFileSync(htmlFullPath, htmlContent);
    
    console.log('\n📄 Enhanced BrowserStack Report Generated:');
    console.log(`   📁 JSON File: ${jsonFullPath}`);
    console.log(`   📋 HTML File: ${htmlFullPath}`);
    console.log(`   🌐 URLs tested: ${results.length}`);
    console.log(`   ✅ Successful: ${successfulResults.length}`);
    console.log(`   ❌ Failed: ${failedResults.length}`);
    console.log(`   🔍 Browser: ${this.config.browser} on ${this.config.os}`);
    console.log(`   🔐 Login used: ${this.config.loginConfig ? 'Yes' : 'No'}`);
    
    if (successfulResults.length > 0) {
      console.log(`   🐛 Total violations: ${report.summary.totalViolations}`);
      console.log(`   📊 Overall Accessibility Score: ${overallScore}/100 (Grade: ${overallGrade.grade} - ${overallGrade.description})`);
    }
    
    return htmlFullPath; // Return HTML path as primary report
  }

  /**
   * Generate enhanced HTML accessibility report for BrowserStack
   */
  private generateHtmlReport(results: A11yTestResult[], reportData: any): string {
    const timestamp = new Date().toLocaleString();
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const allViolations = successfulResults.flatMap(r => r.violations);
    
    // Group violations by impact level
    const violationsByImpact = {
      critical: allViolations.filter(v => v.impact === 'critical'),
      serious: allViolations.filter(v => v.impact === 'serious'),
      moderate: allViolations.filter(v => v.impact === 'moderate'),
      minor: allViolations.filter(v => v.impact === 'minor')
    };

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced BrowserStack A11y Report - ${timestamp}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            position: relative;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header .subtitle {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .browserstack-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.2);
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #ff6b35;
        }
        .summary-card h3 {
            margin: 0 0 15px 0;
            color: #444;
            font-size: 1.1em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #ff6b35;
        }
        .impact-critical { color: #d32f2f; border-left-color: #d32f2f; }
        .impact-serious { color: #f57c00; border-left-color: #f57c00; }
        .impact-moderate { color: #fbc02d; border-left-color: #fbc02d; }
        .impact-minor { color: #388e3c; border-left-color: #388e3c; }
        .impact-passes { color: #4caf50; border-left-color: #4caf50; }
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin: 0 0 20px 0;
            color: #444;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        .page-result {
            border: 1px solid #eee;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .page-header {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .page-url {
            font-weight: bold;
            color: #495057;
            word-break: break-all;
            flex: 1;
        }
        .page-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .page-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .status-success {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .page-score-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            color: white;
            min-width: 60px;
            text-align: center;
        }
        .score-card {
            border-left-color: var(--score-color, #666);
        }
        .score-value {
            font-size: 2em;
            font-weight: bold;
        }
        .score-grade {
            font-size: 0.9em;
            margin-top: 5px;
            opacity: 0.9;
        }
        .violations-container {
            padding: 20px;
        }
        .violation-item {
            border-left: 4px solid #f57c00;
            background: #fff8e1;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 0 5px 5px 0;
        }
        .violation-item.critical { border-left-color: #d32f2f; background: #ffebee; }
        .violation-item.serious { border-left-color: #f57c00; background: #fff8e1; }
        .violation-item.moderate { border-left-color: #fbc02d; background: #fffde7; }
        .violation-item.minor { border-left-color: #388e3c; background: #e8f5e8; }
        .violation-title {
            font-weight: bold;
            color: #444;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .violation-impact {
            background: rgba(0,0,0,0.1);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            text-transform: uppercase;
        }
        .violation-description {
            color: #666;
            margin-bottom: 10px;
        }
        .violation-help {
            font-size: 0.9em;
        }
        .violation-help a {
            color: #1976d2;
            text-decoration: none;
        }
        .violation-help a:hover {
            text-decoration: underline;
        }
        .no-violations {
            text-align: center;
            padding: 40px;
            color: #4caf50;
            font-size: 1.2em;
        }
        .tech-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
            font-size: 0.9em;
            color: #6c757d;
        }
        .browserstack-info {
            background: #ff6b35;
            color: white;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .browserstack-info strong {
            color: #fff;
        }
        .login-info {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            border-radius: 0 5px 5px 0;
            margin-bottom: 20px;
        }
        .tag {
            display: inline-block;
            background: #e9ecef;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            margin-right: 5px;
            margin-bottom: 5px;
        }
        .dashboard-link {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            text-decoration: none;
            display: inline-block;
            margin-top: 10px;
            transition: background 0.3s;
        }
        .dashboard-link:hover {
            background: rgba(255,255,255,0.3);
            color: white;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="browserstack-badge">🌐 BrowserStack</div>
        <h1>🚀 Enhanced BrowserStack A11y Report</h1>
        <div class="subtitle">Generated on ${timestamp} • Cloud Testing with ${reportData.summary.browser} on ${reportData.summary.os}</div>
        <a href="https://automate.browserstack.com/dashboard" target="_blank" class="dashboard-link">
            📊 View BrowserStack Dashboard →
        </a>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <h3>Pages Tested</h3>
            <div class="value">${results.length}</div>
        </div>
        <div class="summary-card impact-passes">
            <h3>Successful Tests</h3>
            <div class="value">${successfulResults.length}</div>
        </div>
        <div class="summary-card score-card" style="background: linear-gradient(135deg, ${reportData.summary.overallAccessibilityGrade?.color || '#666'}, ${reportData.summary.overallAccessibilityGrade?.color || '#666'}aa); color: white; border-left-color: ${reportData.summary.overallAccessibilityGrade?.color || '#666'};">
            <h3 style="color: white;">Overall Score</h3>
            <div class="score-value">${reportData.summary.overallAccessibilityScore || 0}/100</div>
            <div class="score-grade">Grade: ${reportData.summary.overallAccessibilityGrade?.grade || 'N/A'} - ${reportData.summary.overallAccessibilityGrade?.description || 'No data'}</div>
        </div>
        <div class="summary-card impact-critical">
            <h3>Critical Issues</h3>
            <div class="value">${violationsByImpact.critical.length}</div>
        </div>
        <div class="summary-card impact-serious">
            <h3>Serious Issues</h3>
            <div class="value">${violationsByImpact.serious.length}</div>
        </div>
        <div class="summary-card impact-moderate">
            <h3>Moderate Issues</h3>
            <div class="value">${violationsByImpact.moderate.length}</div>
        </div>
        <div class="summary-card impact-minor">
            <h3>Minor Issues</h3>
            <div class="value">${violationsByImpact.minor.length}</div>
        </div>
    </div>

    <div class="section">
        <h2>🔧 BrowserStack Test Configuration</h2>
        <div class="browserstack-info">
            <strong>🌐 BrowserStack Enhanced Testing</strong><br>
            Plan: ${reportData.browserStackInfo.plan} | Method: ${reportData.browserStackInfo.method}<br>
            Features: ${reportData.browserStackInfo.features.map((f: string) => `<span class="tag" style="background: rgba(255,255,255,0.2); color: white;">${f}</span>`).join('')}
        </div>
        <div class="tech-info">
            <strong>Browser:</strong> ${reportData.summary.browser} on ${reportData.summary.os}<br>
            <strong>Generated:</strong> ${reportData.summary.generatedAt}<br>
            <strong>Session:</strong> View details in BrowserStack Dashboard
        </div>
        ${reportData.loginConfig ? `
        <div class="login-info">
            <strong>🔐 Login Configuration:</strong><br>
            Login URL: ${reportData.loginConfig.loginUrl}<br>
            ${reportData.loginConfig.postLoginUrl ? `Post-login URL: ${reportData.loginConfig.postLoginUrl}<br>` : ''}
            Username: ${reportData.loginConfig.username}
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h2>📊 Detailed Results</h2>`;

    // Add results for each page
    results.forEach(result => {
        const hasViolations = result.success && result.violations.length > 0;
        const pageScore = result.accessibilityScore || 0;
        const pageGrade = result.accessibilityGrade;
        
        html += `
        <div class="page-result">
            <div class="page-header">
                <div class="page-url">${result.url}</div>
                <div class="page-info">
                    ${result.success && pageGrade ? `
                    <div class="page-score-badge" style="background-color: ${pageGrade.color};">
                        ${pageScore}/100 (${pageGrade.grade})
                    </div>
                    ` : ''}
                    <div class="page-status ${result.success ? 'status-success' : 'status-failed'}">
                        ${result.success ? 'Success' : 'Failed'}
                    </div>
                </div>
            </div>`;

        if (!result.success) {
            html += `
            <div class="violations-container">
                <div class="violation-item critical">
                    <div class="violation-title">Test Failed</div>
                    <div class="violation-description">${result.error || 'Unknown error occurred during testing'}</div>
                </div>
            </div>`;
        } else if (hasViolations) {
            html += `<div class="violations-container">`;
            result.violations.forEach((violation: any) => {
                html += `
                <div class="violation-item ${violation.impact || 'moderate'}">
                    <div class="violation-title">
                        ${violation.description}
                        <span class="violation-impact">${violation.impact || 'unknown'}</span>
                    </div>
                    <div class="violation-description">
                        <strong>Rule:</strong> ${violation.id}<br>
                        <strong>Nodes affected:</strong> ${violation.nodes ? violation.nodes.length : 0}
                    </div>
                    <div class="violation-help">
                        <a href="${violation.helpUrl}" target="_blank">Learn more about this issue →</a>
                    </div>
                </div>`;
            });
            html += `</div>`;
        } else {
            html += `
            <div class="no-violations">
                ✅ No accessibility violations found on this page!
            </div>`;
        }

        html += `</div>`;
    });

    html += `
    </div>

    <div class="section">
        <h2>💡 Recommendations</h2>
        <div class="tech-info">`;

    if (allViolations.length > 0) {
        // Get top violations from the report data
        const violationCounts: Record<string, number> = {};
        allViolations.forEach(violation => {
            violationCounts[violation.id] = (violationCounts[violation.id] || 0) + 1;
        });
        
        const sortedViolations = Object.entries(violationCounts)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5);

        html += `<strong>Top Issues to Address:</strong><br>`;
        sortedViolations.forEach(([ruleId, count]) => {
            const violation = allViolations.find(v => v.id === ruleId);
            if (violation) {
                html += `• <strong>${violation.description}</strong> (${count} instances)<br>`;
            }
        });

        html += `<br><strong>Next Steps:</strong><br>`;
        html += `• Focus on Critical and Serious issues first<br>`;
        html += `• Use the "Learn more" links for detailed guidance<br>`;
        html += `• Test with screen readers and keyboard navigation<br>`;
        html += `• Re-run tests after implementing fixes<br>`;
        html += `• Use BrowserStack's real device testing for comprehensive validation<br>`;
    } else {
        html += `<strong>🎉 Excellent!</strong> No accessibility violations found. Consider:<br>`;
        html += `• Manual testing with screen readers<br>`;
        html += `• Keyboard navigation testing<br>`;
        html += `• Testing with users who have disabilities<br>`;
        html += `• Cross-browser testing with BrowserStack<br>`;
        html += `• Regular automated testing in your CI/CD pipeline<br>`;
    }

    html += `
        </div>
    </div>

    <div class="section">
        <h2>🌐 BrowserStack Integration</h2>
        <div class="browserstack-info">
            <strong>📊 Session Details:</strong><br>
            • View complete session details in your BrowserStack Dashboard<br>
            • Access screenshots, logs, and video recordings<br>
            • Share results with your team using BrowserStack's collaboration features<br>
            • Use network logs and console logs for additional debugging
            <br><br>
            <a href="https://automate.browserstack.com/dashboard" target="_blank" class="dashboard-link">
                🔗 Open BrowserStack Dashboard
            </a>
        </div>
    </div>

    <footer class="tech-info" style="text-align: center; margin-top: 40px;">
        <strong>Enhanced BrowserStack A11y Tester</strong> - Powered by BrowserStack Cloud + Selenium WebDriver & axe-core<br>
        Generated: ${timestamp} | Browser: ${reportData.summary.browser} on ${reportData.summary.os}
    </footer>

</body>
</html>`;

    return html;
  }

  /**
   * Calculate accessibility score for a page (0-100 scale)
   * Based on violation impact levels with weighted penalties
   */
  private calculateAccessibilityScore(violations: any[]): number {
    if (violations.length === 0) return 100;

    // Weighted penalties for different impact levels
    const penalties = {
      critical: 25,  // Critical issues have high impact
      serious: 15,   // Serious issues have moderate impact
      moderate: 8,   // Moderate issues have some impact
      minor: 3       // Minor issues have low impact
    };

    let totalPenalty = 0;
    violations.forEach(violation => {
      const impact = violation.impact || 'moderate';
      const nodeCount = violation.nodes ? violation.nodes.length : 1;
      totalPenalty += (penalties[impact as keyof typeof penalties] || penalties.moderate) * nodeCount;
    });

    // Calculate score (minimum score is 0)
    const score = Math.max(0, 100 - totalPenalty);
    return Math.round(score);
  }

  /**
   * Get accessibility grade based on score
   */
  private getAccessibilityGrade(score: number): { grade: string; color: string; description: string } {
    if (score >= 90) return { grade: 'A', color: '#4caf50', description: 'Excellent' };
    if (score >= 80) return { grade: 'B', color: '#8bc34a', description: 'Good' };
    if (score >= 70) return { grade: 'C', color: '#ffc107', description: 'Fair' };
    if (score >= 60) return { grade: 'D', color: '#ff9800', description: 'Poor' };
    return { grade: 'F', color: '#f44336', description: 'Critical Issues' };
  }

  /**
   * Close the BrowserStack session
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      console.log('🔒 Enhanced BrowserStack session closed');
    }
  }

  /**
   * Intelligently wait for dynamic content to load and page to stabilize
   */
  private async waitForDynamicContent(): Promise<void> {
    if (!this.driver) return;

    const maxWaitTime = 15000; // Maximum 15 seconds
    const checkInterval = 1000; // Check every second
    const stabilityWindow = 2000; // Page must be stable for 2 seconds
    let stabilityStart = 0;
    let lastElementCount = 0;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Count various page elements to detect changes
        const elementCounts = await this.driver.executeScript(`
          return {
            forms: document.querySelectorAll('form').length,
            inputs: document.querySelectorAll('input').length,
            buttons: document.querySelectorAll('button, input[type="submit"]').length,
            images: document.querySelectorAll('img').length,
            links: document.querySelectorAll('a').length,
            divs: document.querySelectorAll('div').length,
            readyState: document.readyState,
            loadingElements: document.querySelectorAll('[class*="loading"], [class*="spinner"], [id*="loading"], [class*="wait"]').length
          };
        `) as any;

        const totalElements = elementCounts.forms + elementCounts.inputs + elementCounts.buttons + 
                             elementCounts.images + elementCounts.links + elementCounts.divs;

        // Check if page is still loading
        if (elementCounts.readyState !== 'complete') {
          console.log(`   📄 Page still loading (readyState: ${elementCounts.readyState})`);
          await this.driver.sleep(checkInterval);
          continue;
        }

        // Check for loading indicators
        if (elementCounts.loadingElements > 0) {
          console.log(`   ⏳ Found ${elementCounts.loadingElements} loading indicator(s), waiting...`);
          await this.driver.sleep(checkInterval);
          continue;
        }

        // Check for page stability (element count unchanged)
        if (totalElements === lastElementCount) {
          if (stabilityStart === 0) {
            stabilityStart = Date.now();
            console.log(`   🔄 Page appears stable (${totalElements} elements), checking...`);
          } else if (Date.now() - stabilityStart >= stabilityWindow) {
            console.log(`   ✅ Page stable for ${stabilityWindow}ms with ${totalElements} elements`);
            
            // Additional check for form elements specifically
            if (elementCounts.forms > 0 && elementCounts.inputs > 0) {
              console.log(`   🎯 Found ${elementCounts.forms} form(s) with ${elementCounts.inputs} input(s) - ready for login`);
              return;
            } else {
              console.log(`   ⚠️  No forms/inputs detected yet, waiting longer...`);
              stabilityStart = 0; // Reset stability check
            }
          }
        } else {
          // Page still changing
          if (lastElementCount > 0) {
            console.log(`   🔄 Page changing (${lastElementCount} → ${totalElements} elements)`);
          }
          lastElementCount = totalElements;
          stabilityStart = 0;
        }

        await this.driver.sleep(checkInterval);

      } catch (error) {
        console.log(`   ❌ Error checking page stability: ${error}`);
        await this.driver.sleep(checkInterval);
      }
    }

    // Timeout reached - proceed anyway but log warning
    console.log(`   ⚠️  Timeout reached (${maxWaitTime}ms), proceeding with current page state`);
  }

  // ...existing code...
}

/**
 * Main execution function for Enhanced BrowserStack testing with login & crawling
 */
export async function runEnhancedBrowserStackA11yTest(options: {
  startUrl: string;
  username: string;
  accessKey: string;
  browser?: string;
  os?: string;
  maxPages?: number;
  outputPath?: string;
  loginConfig?: {
    loginUrl: string;
    usernameSelector: string;
    passwordSelector: string;
    submitSelector: string;
    username: string;
    password: string;
    postLoginUrl?: string;
  };
}): Promise<void> {
  const tester = new EnhancedBrowserStackA11yTester({
    username: options.username,
    accessKey: options.accessKey,
    browser: options.browser,
    os: options.os,
    projectName: 'Enhanced A11y Test Suite',
    buildName: `Enhanced A11y Testing - ${new Date().toISOString()}`,
    sessionName: `Enhanced A11y Test with Login & Crawling`,
    loginConfig: options.loginConfig
  });

  try {
    await tester.connect();
    
    console.log(`\n🚀 Starting enhanced accessibility testing...\n`);
    const results = await tester.crawlAndTest(options.startUrl, options.maxPages || 10);
    
    const reportPath = tester.generateReport(results, options.outputPath);
    
    const successfulResults = results.filter(r => r.success);
    const totalViolations = successfulResults.reduce((sum, r) => sum + r.violations.length, 0);
    
    console.log('\n🎯 Enhanced BrowserStack Test Summary:');
    console.log(`   URLs tested: ${results.length}`);
    console.log(`   Successful tests: ${successfulResults.length}`);
    console.log(`   Total violations: ${totalViolations}`);
    console.log(`   Login used: ${options.loginConfig ? 'Yes' : 'No'}`);
    console.log(`   Report: ${reportPath}`);
    
    if (totalViolations > 0) {
      console.log('\n⚠️  Accessibility issues found across crawled pages.');
    } else {
      console.log('\n🎉 No accessibility violations found!');
    }
    
  } catch (error) {
    console.error('\n❌ Enhanced BrowserStack test failed:', error);
    throw error;
  } finally {
    await tester.close();
  }
}
