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

      // Wait for the login form to be present in DOM
      await page.waitForSelector('input[placeholder="debiteurnummer"]', { timeout: 15000 });
      logger.info('WASCO', 'Login page loaded, filling form via pure JS...');

      // Step 1: Remove ALL overlays and fill form entirely via page.evaluate
      // This is the ONLY reliable method - pure DOM manipulation with nativeSetter
      const fillSuccess = await page.evaluate((deb, cod, pass) => {
        // Remove overlays first
        document.querySelectorAll('[id*="ookiebot"], [id*="cookie"], [id*="Cookie"], [class*="cookie"], [class*="consent"], [id*="vwo"], [class*="vwo"]').forEach(el => el.remove());
        document.querySelectorAll('iframe[style*="position: fixed"], iframe[style*="position:fixed"]').forEach(el => el.remove());
        document.querySelectorAll('div[style*="z-index"]').forEach(el => {
          const z = parseInt(window.getComputedStyle(el).zIndex);
          if (z > 1000) el.remove();
        });

        // Get the native value setter to bypass OutSystems getters/setters
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

        function fillField(selector, value) {
          const field = document.querySelector(selector);
          if (!field) return 0;
          
          // Use native setter
          nativeSetter.call(field, value);
          
          // Fire comprehensive event chain for OutSystems reactive framework
          field.dispatchEvent(new Event('focus', { bubbles: true }));
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          field.dispatchEvent(new Event('blur', { bubbles: true }));
          
          // Also try triggering keyup on each char (OutSystems sometimes listens to this)
          for (const char of value) {
            field.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            field.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
            field.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
          }
          
          return field.value.length;
        }

        const debLen = fillField('input[placeholder="debiteurnummer"]', deb);
        const codeLen = fillField('input[placeholder="code"]', cod);
        const passLen = fillField('input[placeholder="wachtwoord"]', pass);

        return { success: true, debLen, codeLen, passLen };
      }, debiteurNummer, code, password);
      logger.info('WASCO', 'Field fill result', fillSuccess);

      // If nativeSetter didn't work, try CDP Input.insertText as last resort
      if (fillSuccess.debLen === 0) {
        logger.warn('WASCO', 'NativeSetter failed, trying CDP insertText...');
        const client = await page.target().createCDPSession();
        
        // Focus and insert via CDP for each field
        for (const [selector, value] of [
          ['input[placeholder="debiteurnummer"]', debiteurNummer],
          ['input[placeholder="code"]', code],
          ['input[placeholder="wachtwoord"]', password],
        ]) {
          await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) { el.focus(); el.value = ''; }
          }, selector);
          await new Promise(resolve => setTimeout(resolve, 200));
          await client.send('Input.insertText', { text: value });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Re-check values
        const cdpResult = await page.evaluate(() => {
          const d = document.querySelector('input[placeholder="debiteurnummer"]');
          const c = document.querySelector('input[placeholder="code"]');
          const p = document.querySelector('input[placeholder="wachtwoord"]');
          return { debLen: d?.value.length || 0, codeLen: c?.value.length || 0, passLen: p?.value.length || 0 };
        });
        logger.info('WASCO', 'CDP insertText result', cdpResult);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Screenshot before submit
      try { await page.screenshot({ path: '/tmp/wasco-before-login.png' }); } catch (e) { /* ignore */ }

      // Step 3: Submit via evaluate - click the login button directly
      const submitResult = await page.evaluate(() => {
        // Find the Inloggen button/link
        const buttons = Array.from(document.querySelectorAll('a, button, input[type="submit"]'));
        const loginBtn = buttons.find(b => b.textContent.trim() === 'Inloggen' || b.value === 'Inloggen');
        if (loginBtn) {
          loginBtn.click();
          return { clicked: true, tag: loginBtn.tagName, id: loginBtn.id };
        }
        // Fallback: submit the form directly
        const form = document.querySelector('form');
        if (form) {
          form.submit();
          return { clicked: true, method: 'form.submit' };
        }
        return { clicked: false };
      });
      logger.info('WASCO', 'Login submit attempt', submitResult);

      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
        logger.info('WASCO', 'No navigation after login submit');
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Screenshot after submit
      try { await page.screenshot({ path: '/tmp/wasco-after-login.png' }); } catch (e) { /* ignore */ }

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
