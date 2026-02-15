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
      logger.info('WASCO', 'Login page loaded, filling form via keyboard typing...');

      // Step 1: Remove cookie/overlay elements
      await page.evaluate(() => {
        document.querySelectorAll('[id*="ookiebot"], [id*="cookie"], [id*="Cookie"], [class*="cookie"], [class*="consent"], [id*="vwo"], [class*="vwo"]').forEach(el => el.remove());
        document.querySelectorAll('iframe[style*="position: fixed"], iframe[style*="position:fixed"]').forEach(el => el.remove());
        document.querySelectorAll('div[style*="z-index"]').forEach(el => {
          const z = parseInt(window.getComputedStyle(el).zIndex);
          if (z > 1000) el.remove();
        });
      });

      // Debug: dump all input elements on the page
      const inputDebug = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map(el => ({
          type: el.type,
          placeholder: el.placeholder,
          id: el.id,
          name: el.name,
          className: el.className.substring(0, 80),
          tagName: el.tagName,
          visible: el.offsetParent !== null,
          rect: el.getBoundingClientRect().toJSON()
        }));
      });
      logger.info('WASCO', 'All input elements on login page', { count: inputDebug.length, inputs: JSON.stringify(inputDebug) });

      // Step 2: Fill fields using multiple strategies
      async function fillField(page, selector, value) {
        const result = await page.evaluate((sel, val) => {
          const el = document.querySelector(sel);
          if (!el) return { found: false, selector: sel };
          
          // Strategy 1: Direct value assignment
          el.value = val;
          
          // Strategy 2: Native setter
          try {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, val);
          } catch (e) {}
          
          // Strategy 3: setAttribute
          el.setAttribute('value', val);
          
          // Dispatch comprehensive events
          el.dispatchEvent(new Event('focus', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
          
          return { found: true, valueAfter: el.value, selector: sel };
        }, selector, value);
        logger.info('WASCO', 'fillField result', result);
        await new Promise(r => setTimeout(r, 500));
      }

      // Use the VISIBLE MainContent fields (not the hidden header ones!)
      const mainContentPrefix = '#wt1_Wasco2014Layout_wt1_block_wtMainContent_wtMainContent_';
      await fillField(page, `${mainContentPrefix}wtfc_deb3`, debiteurNummer);
      await fillField(page, `${mainContentPrefix}wtfc_code2`, code);
      await fillField(page, `${mainContentPrefix}wtfc_pass3`, password);

      // Verify fields are filled (check the MainContent fields)
      const fieldValues = await page.evaluate((prefix) => {
        const d = document.querySelector(`${prefix}wtfc_deb3`);
        const c = document.querySelector(`${prefix}wtfc_code2`);
        const p = document.querySelector(`${prefix}wtfc_pass3`);
        return { 
          debLen: d?.value.length || 0, debVal: d?.value?.substring(0, 3) || '',
          codeLen: c?.value.length || 0,
          passLen: p?.value.length || 0
        };
      }, mainContentPrefix);
      logger.info('WASCO', 'Field values after filling (MainContent)', fieldValues);

      await new Promise(r => setTimeout(r, 500));

      // Screenshot before submit
      try { await page.screenshot({ path: '/tmp/wasco-before-login.png' }); } catch (e) { /* ignore */ }

      // Step 3: Click the MainContent submit button (not the header nav link!)
      const submitResult = await page.evaluate(() => {
        // Find the MainContent container
        const mainContent = document.querySelector('[id*="wtMainContent"]');
        if (mainContent) {
          // Look for Inloggen link/button inside MainContent
          const links = mainContent.querySelectorAll('a, button, input[type="submit"]');
          for (const link of links) {
            const text = (link.textContent?.trim() || link.value || '').toLowerCase();
            if (text.includes('inloggen') || text.includes('login')) {
              link.click();
              return { clicked: true, method: 'mainContent-button', tag: link.tagName, id: link.id, text: link.textContent?.trim() };
            }
          }
          // Fallback: submit the form containing MainContent fields
          const form = mainContent.closest('form') || document.querySelector('form');
          if (form) {
            form.submit();
            return { clicked: true, method: 'form.submit()' };
          }
        }
        return { clicked: false, error: 'No MainContent submit button found' };
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
      // When logged in, Wasco shows "Jouw nettoprijs" or "Jouw actieprijs" instead of "Jouw brutoprijs"
      let nettoPrice = null;
      const priceLabel = $('small.jouw-price, small.size.jouw-price').text().trim().toLowerCase();
      
      // Collect ALL price elements with their context for debugging
      const allPriceElements = [];
      $('span.price').each((_, el) => {
        const text = $(el).text().trim();
        const parent = $(el).parent().text().trim().substring(0, 80);
        allPriceElements.push({ text, parent });
      });
      
      logger.info('WASCO', `Price label for ${articleNumber}: "${priceLabel}", price: "${priceSpan}"`, {
        allPriceElements: JSON.stringify(allPriceElements)
      });
      
      if (priceLabel.includes('netto') || priceLabel.includes('actieprijs') || priceLabel.includes('actie')) {
        // The displayed main price IS the netto/actie price (= inkoopprijs)
        nettoPrice = brutoPrice;
        brutoPrice = null;
        
        // Try to extract bruto price from parent text like "Brutoprijs: €82,17"
        $('span.price').each((_, el) => {
          const parentText = $(el).parent().text().trim();
          const brutoMatch = parentText.match(/Brutoprijs:\s*€\s*([\d.,]+)/i);
          if (brutoMatch && !brutoPrice) {
            brutoPrice = parseFloat(brutoMatch[1].replace('.', '').replace(',', '.'));
          }
        });
        
        // Also try to extract from "Korting: XX%" text if bruto not found
        if (!brutoPrice) {
          $('span.price').each((_, el) => {
            const parentText = $(el).parent().text().trim();
            const kortingMatch = parentText.match(/Korting:\s*([\d.,]+)%/i);
            if (kortingMatch && nettoPrice) {
              const kortingPct = parseFloat(kortingMatch[1].replace(',', '.'));
              if (kortingPct > 0 && kortingPct < 100) {
                brutoPrice = Math.round(nettoPrice / (1 - kortingPct / 100) * 100) / 100;
              }
            }
          });
        }
        
        // Fallback: look for secondary span.price elements
        if (!brutoPrice) {
          const allPrices = [];
          $('span.price').each((_, el) => {
            const text = $(el).text().trim();
            const match = text.match(/€\s*([\d.,]+)/);
            if (match) {
              const val = parseFloat(match[1].replace('.', '').replace(',', '.'));
              if (val > 10) allPrices.push(val);
            }
          });
          if (allPrices.length >= 2) {
            brutoPrice = Math.max(...allPrices);
            if (brutoPrice === nettoPrice) brutoPrice = null;
          }
        }
      } else {
        // Not logged in or bruto label - check for multiple prices
        const allPrices = [];
        $('span.price').each((_, el) => {
          const text = $(el).text().trim();
          const match = text.match(/€\s*([\d.,]+)/);
          if (match) {
            const val = parseFloat(match[1].replace('.', '').replace(',', '.'));
            if (val > 10) allPrices.push(val);
          }
        });
        
        if (allPrices.length >= 2) {
          brutoPrice = Math.max(...allPrices);
          nettoPrice = Math.min(...allPrices);
        }
      }

      // Extract specs from ALL kenmerken/spec tables
      const specs = {};
      $('table.specs, table.kenmerken, .product-specs table, .specifications table').each((_, table) => {
        $(table).find('tr').each((_, row) => {
          const key = $(row).find('td.th, th').text().trim();
          const value = $(row).find('td:not(.th)').last().text().trim();
          if (key && value && key !== value) {
            specs[key] = value;
          }
        });
      });
      
      // Also try dl/dt/dd pattern for specs
      $('dl').each((_, dl) => {
        $(dl).find('dt').each((i, dt) => {
          const key = $(dt).text().trim();
          const dd = $(dl).find('dd').eq(i);
          const value = dd ? dd.text().trim() : '';
          if (key && value) {
            specs[key] = value;
          }
        });
      });

      // Extract product description
      const descriptionParts = [];
      $('.product-description, .product-info-description, [class*="description"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) descriptionParts.push(text);
      });
      // Also get bullet point features
      const featuresList = [];
      $('.product-features li, .product-usp li, .product-info li, ul.kenmerken li').each((_, el) => {
        const text = $(el).text().trim();
        if (text) featuresList.push(text);
      });

      // Extract image
      const imageUrl = $('img[src*="imagescdn.wasco.nl"]').first().attr('src') || null;

      // Extract EAN code
      const ean = specs['EAN-Code'] || specs['EAN'] || null;
      const leverancierscode = specs['Leverancierscode'] || specs['Artikelnummer leverancier'] || null;
      const brand = specs['Merk'] || specs['Brand'] || null;

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
        description: descriptionParts.join('\n').substring(0, 1000),
        featuresList,
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

    // First, scrape bruto prices WITHOUT login (public prices)
    // Then login and scrape netto prices
    const brutoPrices = {};
    
    for (const mapping of productMappings) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const scraped = await this.scrapeProduct(mapping.wasco_article_number);
        if (scraped.brutoPrice || scraped.nettoPrice) {
          // Before login, the visible price is the bruto price
          brutoPrices[mapping.wasco_article_number] = scraped.brutoPrice || scraped.nettoPrice;
        }
      } catch (err) {
        logger.warn('WASCO', `Failed to get bruto price for ${mapping.wasco_article_number}`, { error: err.message });
      }
    }
    
    logger.info('WASCO', `Collected bruto prices for ${Object.keys(brutoPrices).length} products before login`);

    // Now login for netto prices
    if (!this.isLoggedIn) {
      try {
        await this.login();
      } catch (err) {
        logger.warn('WASCO', 'Login failed, continuing with bruto prices + discount percentages', { error: err.message });
      }
    }

    for (const mapping of productMappings) {
      try {
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

        // Use bruto price from pre-login scrape
        if (!scraped.brutoPrice && brutoPrices[mapping.wasco_article_number]) {
          scraped.brutoPrice = brutoPrices[mapping.wasco_article_number];
        }
        // Fallback to last known bruto price from database
        if (!scraped.brutoPrice && mapping.last_bruto_price) {
          scraped.brutoPrice = parseFloat(mapping.last_bruto_price);
        }
        
        let purchasePrice = scraped.nettoPrice || scraped.brutoPrice;
        
        if (!scraped.nettoPrice && scraped.brutoPrice && mapping.discount_percent > 0) {
          purchasePrice = scraped.brutoPrice * (1 - mapping.discount_percent / 100);
          purchasePrice = Math.round(purchasePrice * 100) / 100;
          scraped.nettoPrice = purchasePrice; // Store calculated netto
        }
        
        // Calculate actual discount percentage if we have both prices
        let actualDiscount = null;
        if (scraped.brutoPrice && scraped.nettoPrice && scraped.brutoPrice > 0) {
          actualDiscount = Math.round((1 - scraped.nettoPrice / scraped.brutoPrice) * 10000) / 100;
        }

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
            base_price = ?,
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
          actualDiscount,
          imageUrl: scraped.imageUrl,
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
