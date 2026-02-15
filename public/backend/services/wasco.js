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

      // Remove any cookie consent overlays
      await page.evaluate(() => {
        document.querySelectorAll('[id*="ookiebot"], [id*="cookie"], [class*="cookie"], [class*="consent"]').forEach(el => el.remove());
      });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Wait for the login form
      await page.waitForSelector('input[placeholder="debiteurnummer"]', { timeout: 10000 });
      logger.info('WASCO', 'Login page loaded, filling form...');

      // Use real keyboard input - OutSystems listens to keydown/keyup events
      // Clear and type into each field using Puppeteer's built-in type()
      const debField = await page.$('input[placeholder="debiteurnummer"]');
      await debField.click({ clickCount: 3 }); // select all
      await debField.press('Backspace');
      await debField.type(debiteurNummer, { delay: 50 });

      const codeField = await page.$('input[placeholder="code"]');
      await codeField.click({ clickCount: 3 });
      await codeField.press('Backspace');
      await codeField.type(code, { delay: 50 });

      const passField = await page.$('input[placeholder="wachtwoord"]');
      await passField.click({ clickCount: 3 });
      await passField.press('Backspace');
      await passField.type(password, { delay: 50 });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Screenshot before submit
      try { await page.screenshot({ path: '/tmp/wasco-before-login.png' }); } catch (e) { /* ignore */ }

      // Try multiple ways to submit the form
      // 1. Find the login button by text content or type=submit
      const submitted = await page.evaluate(() => {
        // Try by known ID first
        let btn = document.getElementById('wt1_Wasco2014Layout_wt1_block_wtMainContent_wtMainContent_wt72');
        // Fallback: find button/input with "Inloggen" text
        if (!btn) {
          const allBtns = [...document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, .btn')];
          btn = allBtns.find(b => (b.textContent || b.value || '').toLowerCase().includes('inlog'));
        }
        // Fallback: any submit button in the form
        if (!btn) {
          btn = document.querySelector('form input[type="submit"], form button[type="submit"]');
        }
        if (btn) {
          btn.click();
          return btn.id || btn.textContent || 'found';
        }
        return null;
      });
      logger.info('WASCO', 'Login button clicked', { submitted });

      // If button click didn't work, try pressing Enter on password field
      if (!submitted) {
        logger.info('WASCO', 'No button found, pressing Enter on password field');
        await passField.press('Enter');
      }

      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
        logger.info('WASCO', 'No navigation after login submit');
      });

      // Wait for any AJAX
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Screenshot after submit
      try { await page.screenshot({ path: '/tmp/wasco-after-login.png' }); } catch (e) { /* ignore */ }

      // Log page state
      const currentUrl = page.url();
      const pageTitle = await page.title();
      logger.info('WASCO', 'Page after login attempt', { currentUrl, pageTitle });

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
