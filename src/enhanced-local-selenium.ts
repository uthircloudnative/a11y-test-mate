import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import { Options as ChromeOptions } from 'selenium-webdriver/chrome';
import { Options as FirefoxOptions } from 'selenium-webdriver/firefox';
import { Options as EdgeOptions } from 'selenium-webdriver/edge';
import { Options as SafariOptions } from 'selenium-webdriver/safari';
import { AxeBuilder } from '@axe-core/webdriverjs';
import * as fs from 'fs';
import * as path from 'path';

interface EnhancedLocalConfig {
  browser?: string;
  headless?: boolean;
  // Login configuration
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
  // Accessibility scoring
  accessibilityScore?: number;
  accessibilityGrade?: { grade: string; color: string; description: string };
}

/**
 * Enhanced Local Accessibility Tester with Login & Crawling
 * Uses local Selenium WebDriver for accessibility testing
 */
export class EnhancedLocalA11yTester {
  private config: EnhancedLocalConfig;
  private driver?: WebDriver;

  constructor(config: EnhancedLocalConfig = {}) {
    this.config = {
      browser: 'chrome',
      headless: false,
      ...config
    };
  }

  /**
   * Connect to local browser using Selenium WebDriver
   */
  async connect(): Promise<void> {
    console.log('🔗 Connecting to Local Browser...');
    console.log(`📋 Browser: ${this.config.browser} | Headless: ${this.config.headless}`);

    try {
      const builder = new Builder();

      switch (this.config.browser?.toLowerCase()) {
        case 'chrome':
          const chromeOptions = new ChromeOptions();
          if (this.config.headless) {
            chromeOptions.addArguments('--headless=new');
          }
          
          chromeOptions.addArguments(
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
          );
          
          builder.forBrowser('chrome').setChromeOptions(chromeOptions);
          break;

        case 'firefox':
          const firefoxOptions = new FirefoxOptions();
          if (this.config.headless) {
            firefoxOptions.addArguments('--headless');
          }
          firefoxOptions.addArguments('--width=1920', '--height=1080');
          builder.forBrowser('firefox').setFirefoxOptions(firefoxOptions);
          break;

        case 'edge':
          const edgeOptions = new EdgeOptions();
          if (this.config.headless) {
            edgeOptions.addArguments('--headless=new');
          }
          edgeOptions.addArguments(
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
          );
          builder.forBrowser('MicrosoftEdge').setEdgeOptions(edgeOptions);
          break;

        case 'safari':
          const safariOptions = new SafariOptions();
          builder.forBrowser('safari').setSafariOptions(safariOptions);
          break;

        default:
          throw new Error(`Unsupported browser: ${this.config.browser}`);
      }

      this.driver = await builder.build();
      
      console.log('✅ Connected to local browser successfully');
      
      const session = await this.driver.getSession();
      console.log(`🔗 Session ID: ${session.getId()}`);
      
    } catch (error) {
      console.error('❌ Local browser connection failed:', error);
      throw new Error(`Local browser connection failed: ${error instanceof Error ? error.message : String(error)}`);
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
      console.log(`🎯 Trying ${providedSelectors.length} user-provided selector(s)...`);
      for (const selector of providedSelectors) {
        try {
          console.log(`   Testing: ${selector}`);
          const element = await this.driver.findElement(By.css(selector));
          const isValid = await this.validateElement(element, { isVisible: true });
          if (isValid) {
            console.log(`✅ Found ${elementType} using provided selector: ${selector}`);
            return element;
          } else {
            console.log(`   ❌ Element found but not valid (hidden/disabled)`);
          }
        } catch (e) {
          console.log(`   ❌ Selector failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    } else {
      console.log(`ℹ️  No user-provided selectors for ${elementType}`);
    }

    // Enhanced: Try to find all potential elements and rank them
    console.log(`🤖 Using intelligent detection for ${elementType}...`);
    const candidateElements = await this.findCandidateElements(elementType);
    
    if (candidateElements.length > 0) {
      console.log(`📋 Found ${candidateElements.length} candidate(s), using best match...`);
      // Return the best ranked candidate
      const bestElement = candidateElements[0];
      console.log(`✅ Found ${elementType} using intelligent ranking: ${bestElement.strategy} (score: ${bestElement.score})`);
      return bestElement.element;
    } else {
      console.log(`❌ No candidates found using intelligent detection`);
    }

    // Fall back to XPath strategies for text-based detection
    console.log(`🔍 Using XPath detection for ${elementType}...`);
    const xpathStrategies = this.getXPathStrategies(elementType);
    
    for (const xpath of xpathStrategies) {
      try {
        console.log(`   Testing XPath: ${xpath}`);
        const element = await this.driver.findElement(By.xpath(xpath));
        const isValid = await this.validateElement(element, { isVisible: true, isEnabled: true });
        if (isValid) {
          console.log(`✅ Found ${elementType} using XPath: ${xpath}`);
          return element;
        } else {
          console.log(`   ❌ XPath element found but not valid`);
        }
      } catch (e) {
        console.log(`   ❌ XPath failed: ${e instanceof Error ? e.message : e}`);
      }
    }

    // Enhanced: Try generic form field detection as last resort
    console.log(`🔍 Using generic form field detection for ${elementType}...`);
    const genericElement = await this.findGenericFormField(elementType);
    if (genericElement) {
      console.log(`✅ Found ${elementType} using generic detection`);
      return genericElement;
    } else {
      console.log(`❌ Generic detection failed`);
    }

    // Show debugging information before failing
    await this.debugPageElements(elementType);

    throw new Error(`Could not find ${elementType} field using any detection strategy`);
  }

  /**
   * Debug page elements to help troubleshoot detection issues
   */
  private async debugPageElements(elementType: string): Promise<void> {
    if (!this.driver) return;

    console.log(`\n🔧 DEBUG: Analyzing page for ${elementType} field detection issues...`);
    
    try {
      const currentUrl = await this.driver.getCurrentUrl();
      console.log(`📍 Current URL: ${currentUrl}`);

      // Find all input elements
      const allInputs = await this.driver.findElements(By.css('input'));
      console.log(`📝 Found ${allInputs.length} input element(s) on page:`);
      
      for (let i = 0; i < Math.min(allInputs.length, 10); i++) {
        const input = allInputs[i];
        try {
          const type = await input.getAttribute('type') || 'text';
          const name = await input.getAttribute('name') || '(no name)';
          const id = await input.getAttribute('id') || '(no id)';
          const className = await input.getAttribute('class') || '(no class)';
          const placeholder = await input.getAttribute('placeholder') || '(no placeholder)';
          const isVisible = await input.isDisplayed();
          const isEnabled = await input.isEnabled();
          
          console.log(`  Input ${i + 1}: type="${type}" name="${name}" id="${id}" class="${className}" placeholder="${placeholder}" visible=${isVisible} enabled=${isEnabled}`);
        } catch (e) {
          console.log(`  Input ${i + 1}: Error reading attributes - ${e}`);
        }
      }

      // Find all buttons
      const allButtons = await this.driver.findElements(By.css('button, input[type="submit"], input[type="button"]'));
      console.log(`🔘 Found ${allButtons.length} button element(s) on page:`);
      
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        const button = allButtons[i];
        try {
          const tagName = await button.getTagName();
          const type = await button.getAttribute('type') || 'button';
          const text = await button.getText() || '(no text)';
          const id = await button.getAttribute('id') || '(no id)';
          const className = await button.getAttribute('class') || '(no class)';
          const isVisible = await button.isDisplayed();
          const isEnabled = await button.isEnabled();
          
          console.log(`  Button ${i + 1}: <${tagName}> type="${type}" text="${text}" id="${id}" class="${className}" visible=${isVisible} enabled=${isEnabled}`);
        } catch (e) {
          console.log(`  Button ${i + 1}: Error reading attributes - ${e}`);
        }
      }

      // Check if we can find forms
      const forms = await this.driver.findElements(By.css('form'));
      console.log(`🏗️  Found ${forms.length} form element(s) on page`);

      console.log(`\n💡 TROUBLESHOOTING SUGGESTIONS:`);
      console.log(`1. Use the debug script: npx ts-node src/debug-login-fields.ts "${currentUrl}"`);
      console.log(`2. Check if the page requires specific selectors`);
      console.log(`3. Verify the page has loaded completely (wait longer)`);
      console.log(`4. Check for dynamic content or AJAX loading`);
      console.log(`5. Consider if the page uses shadow DOM or iframes`);

    } catch (error) {
      console.log(`❌ Debug analysis failed: ${error}`);
    }
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
   * Find generic form fields as last resort with enhanced logging
   */
  private async findGenericFormField(elementType: string): Promise<any> {
    try {
      console.log(`   🔧 Generic detection for ${elementType}...`);
      
      switch (elementType) {
        case 'username':
          console.log(`   🔍 Looking for text/email/generic inputs...`);
          // Try first text/email input - expanded search
          const textInputSelectors = [
            'input[type="text"]',
            'input[type="email"]', 
            'input:not([type])',
            'input[type=""]'  // Empty type attribute
          ];
          
          for (const selector of textInputSelectors) {
            try {
              const inputs = await this.driver!.findElements(By.css(selector));
              console.log(`     Found ${inputs.length} elements for ${selector}`);
              
              for (const input of inputs) {
                const isValid = await this.validateElement(input, { isVisible: true, isEnabled: true });
                if (isValid) {
                  console.log(`     ✅ Using valid element from ${selector}`);
                  return input;
                } else {
                  console.log(`     ❌ Element not valid (hidden/disabled)`);
                }
              }
            } catch (e) {
              console.log(`     ❌ ${selector} failed: ${e instanceof Error ? e.message : e}`);
            }
          }
          break;

        case 'password':
          console.log(`   🔍 Looking for password inputs...`);
          // Try any password input
          const passwordInputs = await this.driver!.findElements(By.css('input[type="password"]'));
          console.log(`     Found ${passwordInputs.length} password inputs`);
          
          for (const input of passwordInputs) {
            const isValid = await this.validateElement(input, { isVisible: true, isEnabled: true });
            if (isValid) {
              console.log(`     ✅ Using valid password input`);
              return input;
            } else {
              console.log(`     ❌ Password input not valid (hidden/disabled)`);
            }
          }
          break;

        case 'submit':
          console.log(`   🔍 Looking for submit buttons...`);
          // Try any submit button or form button - expanded search
          const buttonSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'input[type="button"]',
            'button:not([type])',  // Buttons without type
            'button',              // All buttons
            'form button',         // Buttons inside forms
            '[role="button"]'      // Elements with button role
          ];
          
          for (const selector of buttonSelectors) {
            try {
              const buttons = await this.driver!.findElements(By.css(selector));
              console.log(`     Found ${buttons.length} elements for ${selector}`);
              
              for (const button of buttons) {
                const isValid = await this.validateElement(button, { isVisible: true, isEnabled: true });
                if (isValid) {
                  console.log(`     ✅ Using valid element from ${selector}`);
                  return button;
                } else {
                  console.log(`     ❌ Element not valid (hidden/disabled)`);
                }
              }
            } catch (e) {
              console.log(`     ❌ ${selector} failed: ${e instanceof Error ? e.message : e}`);
            }
          }
          break;
      }
    } catch (e) {
      console.log(`   ❌ Generic detection error: ${e instanceof Error ? e.message : e}`);
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
        console.log('🎉 Login successful!');
        return { success: true, currentUrl };
      } else {
        console.log('❌ Login appears to have failed');
        return { success: false, currentUrl };
      }

    } catch (error) {
      console.error('❌ Login failed:', error);
      console.log('💡 Try providing more specific selectors or check the login page structure');
      return { success: false };
    }
  }

  /**
   * Verify login success using enhanced multiple criteria
   */
  private async verifyLoginSuccess(loginUrl: string, postLoginUrl?: string): Promise<boolean> {
    if (!this.driver) return false;

    console.log('🔍 Verifying login success using enhanced criteria...');

    try {
      const currentUrl = await this.driver.getCurrentUrl();
      console.log(`   Current URL: ${currentUrl}`);

      // Strategy 1: URL-based verification (traditional approach)
      let urlChanged = false;
      if (currentUrl !== loginUrl) {
        console.log('   ✅ URL changed from login page');
        urlChanged = true;
      }

      if (postLoginUrl && currentUrl.includes(postLoginUrl)) {
        console.log('   ✅ Reached expected post-login URL');
        return true;
      }

      // Strategy 2: Enhanced content verification for non-redirecting sites
      const contentVerified = await this.verifyEnhancedContent();
      console.log(`   Enhanced content verification: ${contentVerified ? '✅ PASS' : '❌ FAIL'}`);

      // Strategy 3: Check for login error messages (negative verification)
      const hasErrors = await this.checkForLoginErrors();
      console.log(`   Login error check: ${hasErrors ? '❌ ERRORS FOUND' : '✅ NO ERRORS'}`);

      // Strategy 4: Check logged-in indicators
      const hasLoggedInIndicators = await this.checkLoggedInIndicators();
      console.log(`   Logged-in indicators: ${hasLoggedInIndicators ? '✅ FOUND' : '❌ NOT FOUND'}`);

      // Strategy 5: Check absence of login form
      const loginFormAbsent = await this.checkAbsenceOfLoginForm();
      console.log(`   Login form absent: ${loginFormAbsent ? '✅ YES' : '❌ NO'}`);

      // Calculate overall login success score
      const successScore = this.calculateLoginSuccessScore({
        urlChanged,
        contentVerified,
        hasErrors: !hasErrors,
        hasLoggedInIndicators,
        loginFormAbsent
      });

      console.log(`   📊 Login success score: ${successScore}/100`);

      // Consider login successful if score is >= 60
      const isSuccessful = successScore >= 60;
      console.log(`   🎯 Login ${isSuccessful ? 'SUCCESSFUL' : 'FAILED'} (threshold: 60)`);

      return isSuccessful;

    } catch (error) {
      console.error('❌ Error during login verification:', error);
      return false;
    }
  }

  /**
   * Enhanced content verification for sites that don't redirect after login
   */
  private async verifyEnhancedContent(): Promise<boolean> {
    if (!this.driver) return false;

    try {
      // Check for user-specific elements
      const userElements = await this.checkUserElements();
      
      // Check for navigation changes
      const navChanges = await this.checkNavigationChanges();
      
      // Check for dashboard or account content
      const dashboardContent = await this.checkDashboardContent();

      return userElements || navChanges || dashboardContent;

    } catch (error) {
      console.log('   Error in enhanced content verification:', error);
      return false;
    }
  }

  /**
   * Check for dashboard or account-specific content
   */
  private async checkDashboardContent(): Promise<boolean> {
    if (!this.driver) return false;

    const dashboardSelectors = [
      // Common dashboard elements
      '[class*="dashboard"]',
      '[data-testid*="dashboard"]',
      '.main-content',
      '.content-area',
      '.user-content',
      '[class*="logged-in"]',
      
      // Account specific
      '[class*="account"]',
      '[data-testid*="account"]',
      '.account-info',
      '.account-details',
      
      // Welcome messages
      '[class*="welcome"]',
      '[data-testid*="welcome"]',
      
      // User-specific content
      '.my-account',
      '.profile-section',
      '.user-dashboard'
    ];

    for (const selector of dashboardSelectors) {
      try {
        const elements = await this.driver.findElements(By.css(selector));
        if (elements.length > 0) {
          console.log(`   Found dashboard content: ${selector}`);
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }

    return false;
  }

  /**
   * Check for login error messages
   */
  private async checkForLoginErrors(): Promise<boolean> {
    if (!this.driver) return false;

    const errorSelectors = [
      // Common error classes
      '.error',
      '.alert-error',
      '.login-error',
      '.form-error',
      '.validation-error',
      '[class*="error"]',
      '[class*="invalid"]',
      
      // Error message containers
      '.error-message',
      '.error-text',
      '.alert-danger',
      '.alert-warning',
      
      // Form validation
      '.field-error',
      '.input-error',
      '[data-testid*="error"]',
      '[role="alert"]'
    ];

    for (const selector of errorSelectors) {
      try {
        const elements = await this.driver.findElements(By.css(selector));
        for (const element of elements) {
          const isVisible = await element.isDisplayed();
          if (isVisible) {
            const text = await element.getText();
            if (text && text.trim().length > 0) {
              console.log(`   Found error message: "${text.substring(0, 100)}..."`);
              return true;
            }
          }
        }
      } catch (e) {
        // Continue checking
      }
    }

    // Check for common error text patterns
    try {
      const errorTexts = [
        'invalid username',
        'invalid password',
        'login failed',
        'authentication failed',
        'incorrect username',
        'incorrect password',
        'invalid credentials'
      ];

      for (const errorText of errorTexts) {
        const xpath = `//text()[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${errorText}')]`;
        const elements = await this.driver.findElements(By.xpath(`//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${errorText}')]`));
        
        if (elements.length > 0) {
          console.log(`   Found error text pattern: "${errorText}"`);
          return true;
        }
      }
    } catch (e) {
      // Continue
    }

    return false;
  }

  /**
   * Calculate login success score based on multiple criteria
   */
  private calculateLoginSuccessScore(criteria: {
    urlChanged: boolean;
    contentVerified: boolean;
    hasErrors: boolean;
    hasLoggedInIndicators: boolean;
    loginFormAbsent: boolean;
  }): number {
    let score = 0;

    // URL change (traditional approach) - 30 points
    if (criteria.urlChanged) score += 30;

    // Enhanced content verification - 25 points
    if (criteria.contentVerified) score += 25;

    // No login errors - 20 points
    if (criteria.hasErrors) score += 20;

    // Logged-in indicators present - 15 points
    if (criteria.hasLoggedInIndicators) score += 15;

    // Login form absent - 10 points
    if (criteria.loginFormAbsent) score += 10;

    return score;
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

      for (const linkElement of linkElements) {
        try {
          const href = await linkElement.getAttribute('href');
          if (href) {
            const url = new URL(href, baseUrl);
            
            // Only include internal links from the same domain
            if (url.hostname === base.hostname) {
              const normalizedUrl = url.protocol + '//' + url.hostname + url.pathname;
              
              // Avoid duplicates and exclude common non-page URLs
              if (!links.includes(normalizedUrl) && 
                  !normalizedUrl.includes('#') &&
                  !normalizedUrl.includes('mailto:') &&
                  !normalizedUrl.includes('tel:') &&
                  !normalizedUrl.match(/\.(pdf|jpg|jpeg|png|gif|css|js|ico)$/i)) {
                links.push(normalizedUrl);
              }
            }
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }

      return links.slice(0, 20); // Limit to 20 links to avoid infinite crawling
    } catch (error) {
      console.error('Error discovering links:', error);
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
      console.log(`🧪 Testing accessibility for: ${url}`);

      // Wait for page to stabilize
      await this.waitForDynamicContent();

      // Inject axe-core and run accessibility tests
      await this.driver.executeScript(`
        if (!window.axe) {
          ${fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')}
        }
      `);

      const results = await this.driver.executeScript(`
        return new Promise((resolve) => {
          axe.run((err, results) => {
            if (err) resolve({ violations: [], passes: [], incomplete: [] });
            else resolve(results);
          });
        });
      `) as any;

      // Calculate accessibility score
      const accessibilityScore = this.calculateAccessibilityScore(results.violations);
      const accessibilityGrade = this.getAccessibilityGrade(accessibilityScore);

      // Get browser info
      const browserInfo = `${this.config.browser} (Local)`;

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
      console.error(`❌ Failed to test ${await this.driver.getCurrentUrl()}:`, error);
      return {
        url: await this.driver.getCurrentUrl(),
        violations: [],
        passes: [],
        incomplete: [],
        timestamp: new Date().toISOString(),
        browserInfo: `${this.config.browser} (Local)`,
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
        console.log('✅ Login successful, proceeding with crawling');
        
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
    await this.driver.sleep(2000); // Wait for page load

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
          browserInfo: `${this.config.browser} (Local)`,
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
    const jsonFilename = outputPath || `enhanced-local-a11y-report-${timestamp}.json`;
    const htmlFilename = `enhanced-local-a11y-report-${timestamp}.html`;
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
        headless: this.config.headless,
        generatedAt: new Date().toISOString(),
        loginUsed: !!this.config.loginConfig,
        overallAccessibilityScore: overallScore,
        overallAccessibilityGrade: overallGrade
      },
      testingInfo: {
        platform: 'Local',
        method: 'Enhanced Local Selenium WebDriver',
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
    
    console.log('\n📄 Enhanced Local Report Generated:');
    console.log(`   📁 JSON File: ${jsonFullPath}`);
    console.log(`   📋 HTML File: ${htmlFullPath}`);
    console.log(`   🌐 URLs tested: ${results.length}`);
    console.log(`   ✅ Successful: ${successfulResults.length}`);
    console.log(`   ❌ Failed: ${failedResults.length}`);
    console.log(`   🔍 Browser: ${this.config.browser} (${this.config.headless ? 'headless' : 'headed'})`);
    console.log(`   🔐 Login used: ${this.config.loginConfig ? 'Yes' : 'No'}`);
    
    if (successfulResults.length > 0) {
      console.log(`   🐛 Total violations: ${report.summary.totalViolations}`);
      console.log(`   📊 Overall Accessibility Score: ${overallScore}/100 (Grade: ${overallGrade.grade} - ${overallGrade.description})`);
    }
    
    return htmlFullPath; // Return HTML path as primary report
  }

  /**
   * Generate HTML accessibility report for local testing
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
    <title>Enhanced Local A11y Report - ${timestamp}</title>
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
            background: linear-gradient(135deg, #007cba 0%, #0056b3 100%);
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
            border-left: 4px solid #007cba;
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
            color: #007cba;
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
        .local-info {
            background: #007cba;
            color: white;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .local-info strong {
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
    </style>
</head>
<body>
    <div class="header">
        <h1>🖥️ Enhanced Local A11y Report</h1>
        <div class="subtitle">Generated on ${timestamp} • Local Testing with ${reportData.summary.browser}</div>
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
        <h2>🔧 Local Test Configuration</h2>
        <div class="local-info">
            <strong>🖥️ Local Enhanced Testing</strong><br>
            Method: ${reportData.testingInfo.method}<br>
            Features: ${reportData.testingInfo.features.map((f: string) => `<span class="tag" style="background: rgba(255,255,255,0.2); color: white;">${f}</span>`).join('')}
        </div>
        <div class="tech-info">
            <strong>Browser:</strong> ${reportData.summary.browser} (${reportData.summary.headless ? 'headless' : 'headed'})<br>
            <strong>Generated:</strong> ${reportData.summary.generatedAt}<br>
            <strong>Platform:</strong> Local Machine
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
        html += `• Consider testing in additional browsers<br>`;
    } else {
        html += `<strong>🎉 Excellent!</strong> No accessibility violations found. Consider:<br>`;
        html += `• Manual testing with screen readers<br>`;
        html += `• Keyboard navigation testing<br>`;
        html += `• Testing with users who have disabilities<br>`;
        html += `• Cross-browser testing<br>`;
        html += `• Regular automated testing in your CI/CD pipeline<br>`;
    }

    html += `
        </div>
    </div>

    <footer class="tech-info" style="text-align: center; margin-top: 40px;">
        <strong>Enhanced Local A11y Tester</strong> - Powered by Selenium WebDriver & axe-core<br>
        Generated: ${timestamp} | Browser: ${reportData.summary.browser} (Local Testing)
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

    let penalty = 0;
    violations.forEach(violation => {
      switch (violation.impact) {
        case 'critical':
          penalty += 20;
          break;
        case 'serious':
          penalty += 10;
          break;
        case 'moderate':
          penalty += 5;
          break;
        case 'minor':
          penalty += 2;
          break;
        default:
          penalty += 3;
      }
    });

    return Math.max(0, 100 - penalty);
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
   * Intelligently wait for dynamic content to load and page to stabilize
   */
  private async waitForDynamicContent(): Promise<void> {
    if (!this.driver) return;

    try {
      // Wait for page to be in ready state
      await this.driver.wait(async () => {
        const readyState = await this.driver!.executeScript('return document.readyState');
        return readyState === 'complete';
      }, 10000);

      // Wait for any pending network requests to complete
      await this.driver.sleep(1000);

      // Check if page has stabilized (no DOM changes for 500ms)
      let stableCount = 0;
      let lastBodyContent = '';
      
      for (let i = 0; i < 5; i++) {
        const currentBodyContent = await this.driver.executeScript('return document.body.innerHTML.length') as string;
        if (currentBodyContent === lastBodyContent) {
          stableCount++;
        } else {
          stableCount = 0;
          lastBodyContent = currentBodyContent;
        }
        
        if (stableCount >= 2) break;
        await this.driver.sleep(500);
      }

    } catch (error) {
      // If we can't detect stability, just wait a bit longer
      await this.driver.sleep(2000);
    }
  }

  /**
   * Close the local browser session
   */
  async close(): Promise<void> {
    if (this.driver) {
      console.log('🔌 Closing local browser session...');
      await this.driver.quit();
      this.driver = undefined;
      console.log('✅ Browser session closed');
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

}

/**
 * Main execution function for Enhanced Local testing with login & crawling
 */
export async function runEnhancedLocalA11yTest(options: {
  startUrl: string;
  browser?: string;
  headless?: boolean;
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
  const tester = new EnhancedLocalA11yTester({
    browser: options.browser,
    headless: options.headless,
    loginConfig: options.loginConfig
  });

  try {
    console.log('🚀 Starting Enhanced Local A11y Testing...');
    
    // Connect to local browser
    await tester.connect();
    
    // Run crawl and test
    const results = await tester.crawlAndTest(options.startUrl, options.maxPages || 10);
    
    // Generate report
    const reportPath = tester.generateReport(results, options.outputPath);
    
    console.log('\n🎉 Testing completed successfully!');
    console.log(`📄 Report available at: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
    throw error;
  } finally {
    await tester.close();
  }
}
