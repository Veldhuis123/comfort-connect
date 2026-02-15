const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('./logger');

// =============================================
// Wasco.nl Price Scraping Service
// =============================================

class WascoScraper {
  constructor() {
    this.baseUrl = 'https://www.wasco.nl';
    this.session = null;
    this.cookies = '';
    this.isLoggedIn = false;
  }

  // Create axios instance with session cookies
  getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Cookie': this.cookies,
      },
      maxRedirects: 5,
      timeout: 30000,
    });
  }

  // Extract and deduplicate cookies from response headers
  extractCookies(response) {
    const setCookies = response.headers['set-cookie'];
    if (setCookies) {
      // Parse existing cookies into a map for deduplication
      const cookieMap = {};
      if (this.cookies) {
        this.cookies.split('; ').forEach(c => {
          const eqIdx = c.indexOf('=');
          if (eqIdx > 0) {
            cookieMap[c.substring(0, eqIdx)] = c.substring(eqIdx + 1);
          }
        });
      }
      // Add/overwrite with new cookies
      setCookies.forEach(c => {
        const cookiePart = c.split(';')[0];
        const eqIdx = cookiePart.indexOf('=');
        if (eqIdx > 0) {
          cookieMap[cookiePart.substring(0, eqIdx)] = cookiePart.substring(eqIdx + 1);
        }
      });
      // Rebuild cookie string
      this.cookies = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
    }
  }

  // Login to Wasco using Puppeteer (headless browser)
  async login() {
    const debiteurNummer = process.env.WASCO_DEBITEURNUMMER;
    const code = process.env.WASCO_CODE;
    const password = process.env.WASCO_PASSWORD;

    if (!debiteurNummer || !code || !password) {
      throw new Error('WASCO_DEBITEURNUMMER, WASCO_CODE en WASCO_PASSWORD moeten in .env staan');
    }

    let browser = null;
    try {
      logger.info('WASCO', 'Logging in to Wasco.nl via Puppeteer...');

      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to login page
      await page.goto(`${this.baseUrl}/inloggen`, { waitUntil: 'networkidle2', timeout: 30000 });

      // Dismiss cookie consent popup if present (Cookiebot / generic)
      try {
        // Wait a moment for cookie popup to appear
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try multiple cookie consent selectors
        const cookieSelectors = [
          '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
          '#CybotCookiebotDialogBodyButtonAccept', 
          '.coi-banner__accept',
          '#onetrust-accept-btn-handler',
          '.cc-btn.cc-dismiss',
          '.cc-allow',
          'button[data-cookie-accept]',
          '.cookie-accept',
          '#accept-cookies',
          // Cookiebot widget (the round icon at bottom-left)
          '#CookiebotWidget .CookiebotWidget-body button',
        ];
        
        for (const selector of cookieSelectors) {
          const btn = await page.$(selector);
          if (btn) {
            await btn.click();
            logger.info('WASCO', `Cookie consent dismissed via: ${selector}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
          }
        }
      } catch (e) {
        logger.info('WASCO', 'No cookie popup found or could not dismiss');
      }

      // Wait for the main login form fields
      await page.waitForSelector('input[placeholder="debiteurnummer"]', { timeout: 10000 });
      
      logger.info('WASCO', 'Login page loaded, filling form...');

      // Clear fields first then type
      await page.click('input[placeholder="debiteurnummer"]', { clickCount: 3 });
      await page.type('input[placeholder="debiteurnummer"]', debiteurNummer);
      await page.click('input[placeholder="code"]', { clickCount: 3 });
      await page.type('input[placeholder="code"]', code);
      await page.click('input[placeholder="wachtwoord"]', { clickCount: 3 });
      await page.type('input[placeholder="wachtwoord"]', password);

      // Save screenshot before login click
      try {
        await page.screenshot({ path: '/tmp/wasco-before-login.png', fullPage: false });
        logger.info('WASCO', 'Screenshot saved: /tmp/wasco-before-login.png');
      } catch (e) { /* ignore */ }

      // Try pressing Enter on the password field instead of clicking the button
      // (more reliable on OutSystems forms)
      await page.focus('input[placeholder="wachtwoord"]');
      await page.keyboard.press('Enter');

      // Wait for navigation or in-place update
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
        logger.info('WASCO', 'No navigation after login submit, page may have updated in-place');
      });

      // Wait for AJAX updates
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Save screenshot after login attempt
      try {
        await page.screenshot({ path: '/tmp/wasco-after-login.png', fullPage: false });
        logger.info('WASCO', 'Screenshot saved: /tmp/wasco-after-login.png');
      } catch (e) { /* ignore */ }

      // Check for error messages on login page
      const errorMsg = await page.evaluate(() => {
        const errorEl = document.querySelector('.Feedback_Message_Error, .feedback-error, .Form_Error, .error-message, [class*="Error"], .Feedback_Message');
        return errorEl ? errorEl.textContent.trim() : null;
      });
      if (errorMsg) {
        logger.error('WASCO', 'Login form error detected', { errorMsg });
      }

      // Check current URL and page content
      const currentUrl = page.url();
      const pageTitle = await page.title();
      logger.info('WASCO', 'Page after login attempt', { currentUrl, pageTitle, hasError: !!errorMsg, errorMsg });

      // Extract all cookies from the browser
      const browserCookies = await page.cookies();
      this.cookies = browserCookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      logger.info('WASCO', 'Browser cookies extracted', {
        cookieCount: browserCookies.length,
        cookieNames: browserCookies.map(c => c.name),
      });

      // Check the current page for login success indicators
      const pageUrl = page.url();
      const pageContent = await page.content();
      const hasLogout = pageContent.includes('Uitloggen') || pageContent.includes('uitloggen');
      const hasWelcome = pageContent.includes('Welkom') || pageContent.includes('welkom');
      const stillOnLogin = pageUrl.includes('/inloggen');

      logger.info('WASCO', 'Login page state after submit', {
        pageUrl,
        hasLogout,
        hasWelcome,
        stillOnLogin,
      });

      // Verify by navigating to a product page
      await page.goto(`${this.baseUrl}/artikel/7817827`, { waitUntil: 'networkidle2', timeout: 15000 });
      
      const priceLabel = await page.evaluate(() => {
        const el = document.querySelector('small.jouw-price, small.size.jouw-price');
        return el ? el.textContent.trim() : '';
      });
      const priceText = await page.evaluate(() => {
        const el = document.querySelector('span.price');
        return el ? el.textContent.trim() : '';
      });
      const hasNettoPrice = priceLabel.toLowerCase().includes('netto');

      // Re-extract cookies after verification (may have updated)
      const finalCookies = await page.cookies();
      this.cookies = finalCookies.map(c => `${c.name}=${c.value}`).join('; ');

      logger.info('WASCO', 'Login verification', {
        priceLabel,
        priceText,
        hasNettoPrice,
        finalCookieCount: finalCookies.length,
      });

      await browser.close();
      browser = null;

      if (hasNettoPrice) {
        this.isLoggedIn = true;
        logger.info('WASCO', 'Successfully logged in to Wasco.nl (netto prices visible)');
        return true;
      }

      this.isLoggedIn = false;
      logger.error('WASCO', 'Login FAILED - netto prices not visible after Puppeteer login', {
        priceLabel,
        hasNettoPrice,
      });
      return false;

    } catch (error) {
      if (browser) {
        try { await browser.close(); } catch (e) { /* ignore */ }
      }
      logger.error('WASCO', 'Login failed', { error: error.message, stack: error.stack });
      throw new Error(`Wasco login mislukt: ${error.message}`);
    }
  }

  // Scrape a single product page by article number
  async scrapeProduct(articleNumber) {
    try {
      const client = this.getClient();
      const url = `/artikel/${articleNumber}`;
      
      logger.info('WASCO', `Scraping product ${articleNumber}`);
      const response = await client.get(url);
      this.extractCookies(response);

      const $ = cheerio.load(response.data);

      // Extract product info from breadcrumb or h1
      const name = $('ol li:last-child a').text().trim() || 
                   $('h1').first().text().trim() || 
                   $('title').text().split(' - ')[0].trim();
      
      // Extract bruto price from the price span (e.g., "€3.475,00")
      let brutoPrice = null;
      const priceSpan = $('span.price').first().text().trim();
      if (priceSpan) {
        const priceMatch = priceSpan.match(/€\s*([\d.,]+)/);
        if (priceMatch) {
          brutoPrice = parseFloat(priceMatch[1].replace('.', '').replace(',', '.'));
        }
      }

      // Extract netto price (only visible when logged in)
      // When logged in, Wasco shows "Jouw nettoprijs" instead of "Jouw brutoprijs"
      let nettoPrice = null;
      const priceLabel = $('small.jouw-price, small.size.jouw-price').text().trim().toLowerCase();
      
      logger.info('WASCO', `Price label for ${articleNumber}: "${priceLabel}", price: "${priceSpan}"`);
      
      if (priceLabel.includes('netto')) {
        // The displayed price IS the netto price
        nettoPrice = brutoPrice;
        brutoPrice = null; // We don't have bruto in this case
      }
      
      // Check for a second price element (some pages show both)
      const allPrices = [];
      $('span.price').each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/€\s*([\d.,]+)/);
        if (match) {
          allPrices.push(parseFloat(match[1].replace('.', '').replace(',', '.')));
        }
      });
      
      if (allPrices.length >= 2) {
        brutoPrice = Math.max(...allPrices);
        nettoPrice = Math.min(...allPrices);
      }

      // Extract specs from the kenmerken table
      const specs = {};
      $('table.specs').each((_, table) => {
        $(table).find('tr').each((_, row) => {
          const key = $(row).find('td.th').text().trim();
          const value = $(row).find('td:not(.th)').text().trim();
          if (key && value) {
            specs[key] = value;
          }
        });
      });

      // Extract image
      const imageUrl = $('img[src*="imagescdn.wasco.nl"]').first().attr('src') || null;

      // Extract EAN code
      const ean = specs['EAN-Code'] || null;
      const leverancierscode = specs['Leverancierscode'] || null;
      const brand = specs['Merk'] || null;

      const result = {
        articleNumber,
        name,
        brand,
        brutoPrice,
        nettoPrice,
        leverancierscode,
        ean,
        imageUrl,
        specs,
        scrapedAt: new Date().toISOString(),
      };

      logger.info('WASCO', `Scraped ${articleNumber}: ${name}`, {
        brutoPrice,
        nettoPrice,
        leverancierscode,
      });

      return result;

    } catch (error) {
      logger.error('WASCO', `Failed to scrape product ${articleNumber}`, { error: error.message });
      return {
        articleNumber,
        error: error.message,
        scrapedAt: new Date().toISOString(),
      };
    }
  }

  // Search Wasco for products
  async searchProducts(query) {
    try {
      const client = this.getClient();
      const response = await client.get(`/zoeken?SearchText=${encodeURIComponent(query)}`);
      this.extractCookies(response);

      const $ = cheerio.load(response.data);
      const results = [];

      // Parse search results - look for product cards/links
      $('a[href*="/artikel/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const articleMatch = href.match(/\/artikel\/(\d+)/);
        if (articleMatch) {
          const articleNumber = articleMatch[1];
          const name = $(el).text().trim() || $(el).attr('title') || '';
          
          // Avoid duplicates
          if (name && !results.find(r => r.articleNumber === articleNumber)) {
            results.push({
              articleNumber,
              name: name.substring(0, 200),
              url: `${this.baseUrl}/artikel/${articleNumber}`,
            });
          }
        }
      });

      logger.info('WASCO', `Search for "${query}" returned ${results.length} results`);
      return results;

    } catch (error) {
      logger.error('WASCO', `Search failed for "${query}"`, { error: error.message });
      throw error;
    }
  }

  // Scrape multiple products and sync with database
  async syncProducts(db, productMappings) {
    const results = {
      total: productMappings.length,
      success: 0,
      failed: 0,
      updated: 0,
      skipped: 0,
      details: [],
    };

    // Login first
    if (!this.isLoggedIn) {
      await this.login();
    }

    for (const mapping of productMappings) {
      try {
        // Add a delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));

        const scraped = await this.scrapeProduct(mapping.wasco_article_number);
        
        if (scraped.error) {
          results.failed++;
          results.details.push({
            productId: mapping.product_id,
            articleNumber: mapping.wasco_article_number,
            status: 'error',
            message: scraped.error,
          });
          continue;
        }

        // Determine the price to use (netto if available, otherwise bruto)
        const purchasePrice = scraped.nettoPrice || scraped.brutoPrice;

        if (!purchasePrice) {
          results.skipped++;
          results.details.push({
            productId: mapping.product_id,
            articleNumber: mapping.wasco_article_number,
            status: 'skipped',
            message: 'Geen prijs gevonden',
          });
          continue;
        }

        // Update the product's purchase price in the database
        await db.query(
          `UPDATE products SET 
            purchase_price = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [purchasePrice, mapping.product_id]
        );

        // Log the price update
        await db.query(
          `INSERT INTO wasco_price_log (product_id, wasco_article_number, bruto_price, netto_price, scraped_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE bruto_price = VALUES(bruto_price), netto_price = VALUES(netto_price), scraped_at = NOW()`,
          [mapping.product_id, mapping.wasco_article_number, scraped.brutoPrice, scraped.nettoPrice]
        );

        results.success++;
        results.updated++;
        results.details.push({
          productId: mapping.product_id,
          articleNumber: mapping.wasco_article_number,
          name: scraped.name,
          status: 'updated',
          brutoPrice: scraped.brutoPrice,
          nettoPrice: scraped.nettoPrice,
          purchasePrice,
        });

      } catch (error) {
        results.failed++;
        results.details.push({
          productId: mapping.product_id,
          articleNumber: mapping.wasco_article_number,
          status: 'error',
          message: error.message,
        });
      }
    }

    logger.info('WASCO', 'Sync completed', {
      total: results.total,
      success: results.success,
      failed: results.failed,
      updated: results.updated,
    });

    return results;
  }

  // Logout / clear session
  logout() {
    this.cookies = '';
    this.isLoggedIn = false;
    logger.info('WASCO', 'Session cleared');
  }
}

// Singleton instance
let scraperInstance = null;

function getWascoScraper() {
  if (!scraperInstance) {
    scraperInstance = new WascoScraper();
  }
  return scraperInstance;
}

module.exports = {
  WascoScraper,
  getWascoScraper,
};
