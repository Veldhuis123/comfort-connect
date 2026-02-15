const axios = require('axios');
const cheerio = require('cheerio');
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

  // Extract cookies from response headers
  extractCookies(response) {
    const setCookies = response.headers['set-cookie'];
    if (setCookies) {
      const newCookies = setCookies.map(c => c.split(';')[0]).join('; ');
      if (this.cookies) {
        this.cookies = this.cookies + '; ' + newCookies;
      } else {
        this.cookies = newCookies;
      }
    }
  }

  // Login to Wasco
  async login() {
    const debiteurNummer = process.env.WASCO_DEBITEURNUMMER;
    const code = process.env.WASCO_CODE;
    const password = process.env.WASCO_PASSWORD;

    if (!debiteurNummer || !code || !password) {
      throw new Error('WASCO_DEBITEURNUMMER, WASCO_CODE en WASCO_PASSWORD moeten in .env staan');
    }

    try {
      logger.info('WASCO', 'Logging in to Wasco.nl...');

      // Step 1: Get login page for hidden form fields
      const client = this.getClient();
      const loginPageRes = await client.get('/inloggen');
      this.extractCookies(loginPageRes);

      const $ = cheerio.load(loginPageRes.data);
      
      // Extract ASP.NET hidden fields
      const viewState = $('input[name="__VIEWSTATE"]').val() || '';
      const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val() || '';
      const eventValidation = $('input[name="__EVENTVALIDATION"]').val() || '';
      
      // Find form fields in the MAIN CONTENT login form (not the header mini-login)
      // The main login form is inside #wt1_Wasco2014Layout_wt1_block_wtMainContent
      const mainContent = $('#wt1_Wasco2014Layout_wt1_block_wtMainContent');
      const debInput = mainContent.find('input[placeholder="debiteurnummer"]');
      const codeInput = mainContent.find('input[placeholder="code"]');
      const passInput = mainContent.find('input[placeholder="wachtwoord"]');
      const loginBtn = mainContent.find('a.btn.sec.Is_Default');
      
      // Use hardcoded MainContent field names as fallback (from the actual login page HTML)
      const debName = debInput.attr('name') || 'wt1$Wasco2014Layout_wt1$block$wtMainContent$wtMainContent$wtfc_deb3';
      const codeName = codeInput.attr('name') || 'wt1$Wasco2014Layout_wt1$block$wtMainContent$wtMainContent$wtfc_code2';
      const passName = passInput.attr('name') || 'wt1$Wasco2014Layout_wt1$block$wtMainContent$wtMainContent$wtfc_pass3';
      // ASP.NET __EVENTTARGET needs UniqueID format ($ separators), not HTML id (_ separators)
      const loginBtnHtmlId = loginBtn.attr('id') || 'wt1_Wasco2014Layout_wt1_block_wtMainContent_wtMainContent_wt72';
      const loginBtnUniqueId = loginBtnHtmlId.replace(/_/g, '$');

      logger.info('WASCO', 'Found form fields', { 
        debName, codeName, passName, loginBtnHtmlId, loginBtnUniqueId,
        viewStateLength: viewState.length,
        viewStateGeneratorLength: viewStateGenerator.length,
        eventValidationLength: eventValidation.length,
      });

      // Step 2: Submit login form using OutSystems ASP.NET postback
      const formData = new URLSearchParams();
      formData.append('__VIEWSTATE', viewState);
      formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
      formData.append('__EVENTVALIDATION', eventValidation);
      formData.append('__EVENTTARGET', loginBtnUniqueId);
      formData.append('__EVENTARGUMENT', '');
      formData.append(debName, debiteurNummer);
      formData.append(codeName, code);
      formData.append(passName, password);

      logger.info('WASCO', 'Submitting login form', {
        debiteurnummer: debiteurNummer,
        codeLength: code ? code.length : 0,
        passwordLength: password ? password.length : 0,
        formFieldCount: Array.from(formData.keys()).length,
      });

      const loginRes = await this.getClient().post('/inloggen', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.cookies,
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      this.extractCookies(loginRes);

      // Extract a snippet of the response to debug login issues
      const responseSnippet = loginRes.data ? loginRes.data.substring(0, 500) : '';
      const hasErrorMessage = loginRes.data ? 
        loginRes.data.includes('Ongeldige') || 
        loginRes.data.includes('foutmelding') || 
        loginRes.data.includes('incorrect') ||
        loginRes.data.includes('mislukt') : false;
      // Check if we got redirected to a different page (successful login)
      const finalUrl = loginRes.request && loginRes.request.res ? loginRes.request.res.responseUrl : 'unknown';

      logger.info('WASCO', 'Login POST response', { 
        status: loginRes.status, 
        finalUrl,
        hasSetCookie: !!loginRes.headers['set-cookie'],
        responseLength: loginRes.data ? loginRes.data.length : 0,
        hasErrorMessage,
        // Show if the response still contains the login form (meaning login failed)
        stillHasLoginForm: loginRes.data ? loginRes.data.includes('placeholder="debiteurnummer"') : false,
        responseSnippet: responseSnippet.substring(0, 200),
      });

      // Verify login by checking a product page for netto pricing
      const verifyRes = await this.getClient().get('/artikel/7817827');
      this.extractCookies(verifyRes);
      const verify$ = cheerio.load(verifyRes.data);
      
      // Extract what the page actually shows
      const priceLabelText = verify$('small.jouw-price, small.size.jouw-price').text().trim();
      const priceText = verify$('span.price').first().text().trim();
      const hasLoginPrompt = verify$('span:contains("Log in voor jouw prijs")').length > 0 ||
                             verify$('a:contains("Log in voor jouw prijs")').length > 0;
      const hasNettoPrice = priceLabelText.toLowerCase().includes('netto');
      
      logger.info('WASCO', 'Login verification', {
        priceLabelText,
        priceText,
        hasLoginPrompt,
        hasNettoPrice,
        cookies: this.cookies.substring(0, 100) + '...',
      });

      if (hasNettoPrice || !hasLoginPrompt) {
        this.isLoggedIn = true;
        logger.info('WASCO', 'Successfully logged in to Wasco.nl (netto prices visible)');
        return true;
      }

      // Login failed - do NOT set isLoggedIn to true so we retry next time
      this.isLoggedIn = false;
      logger.error('WASCO', 'Login FAILED - netto prices not visible. Check WASCO_DEBITEURNUMMER, WASCO_CODE, WASCO_PASSWORD in .env', {
        hasLoginPrompt,
        hasNettoPrice,
        priceLabelText,
      });
      return false;

    } catch (error) {
      logger.error('WASCO', 'Login failed', { error: error.message });
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
