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
    const username = process.env.WASCO_USERNAME;
    const password = process.env.WASCO_PASSWORD;

    if (!username || !password) {
      throw new Error('WASCO_USERNAME en WASCO_PASSWORD moeten in .env staan');
    }

    try {
      logger.info('WASCO', 'Logging in to Wasco.nl...');

      // Step 1: Get login page for CSRF tokens/viewstate
      const client = this.getClient();
      const loginPageRes = await client.get('/Wasco2014/inloggen');
      this.extractCookies(loginPageRes);

      const $ = cheerio.load(loginPageRes.data);
      
      // Extract ASP.NET form fields
      const viewState = $('input[name="__VIEWSTATE"]').val() || '';
      const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val() || '';
      const eventValidation = $('input[name="__EVENTVALIDATION"]').val() || '';

      // Step 2: Submit login form
      const formData = new URLSearchParams();
      formData.append('__VIEWSTATE', viewState);
      formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
      formData.append('__EVENTVALIDATION', eventValidation);
      // Common ASP.NET login field names - adjust if needed
      formData.append('ctl00$ContentPlaceHolder1$txtUsername', username);
      formData.append('ctl00$ContentPlaceHolder1$txtPassword', password);
      formData.append('ctl00$ContentPlaceHolder1$btnLogin', 'Inloggen');

      const loginRes = await this.getClient().post('/Wasco2014/inloggen', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.cookies,
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 400 || status === 302,
      });

      this.extractCookies(loginRes);

      // Follow redirect if needed
      if (loginRes.status === 302 && loginRes.headers.location) {
        const redirectRes = await this.getClient().get(loginRes.headers.location);
        this.extractCookies(redirectRes);
      }

      // Verify login by checking a known page
      const verifyRes = await this.getClient().get('/');
      this.extractCookies(verifyRes);
      const verify$ = cheerio.load(verifyRes.data);
      
      // Check if we see "Uitloggen" or "Mijn Wasco" indicating we're logged in
      const loggedInIndicator = verify$('a:contains("Uitloggen"), a:contains("Mijn account"), a:contains("Mijn Wasco")').length > 0;
      
      if (loggedInIndicator) {
        this.isLoggedIn = true;
        logger.info('WASCO', 'Successfully logged in to Wasco.nl');
        return true;
      }

      // Even if we can't verify, proceed - the netto price check will confirm
      this.isLoggedIn = true;
      logger.warn('WASCO', 'Login submitted but could not verify - proceeding anyway');
      return true;

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

      // Extract product info
      const name = $('h1').first().text().trim() || 
                   $('title').text().split(' - ')[0].trim();
      
      // Extract bruto price
      const brutoText = $('*:contains("brutoprijs")').closest('div, span, td').text() ||
                        $('*:contains("Bruto prijs")').closest('div, span, td').text() || '';
      const brutoMatch = brutoText.match(/€\s*([\d.,]+)/);
      const brutoPrice = brutoMatch ? parseFloat(brutoMatch[1].replace('.', '').replace(',', '.')) : null;

      // Extract netto price (only visible when logged in)
      let nettoPrice = null;
      const nettoText = $('*:contains("nettoprijs"), *:contains("Netto prijs"), *:contains("Jouw prijs")').text() || '';
      const nettoMatch = nettoText.match(/€\s*([\d.,]+)/);
      if (nettoMatch) {
        nettoPrice = parseFloat(nettoMatch[1].replace('.', '').replace(',', '.'));
      }

      // Try alternative price selectors
      if (!nettoPrice) {
        // Look for price elements with specific classes
        const priceElements = $('.price-net, .netto-price, .your-price, [class*="netto"], [class*="net-price"]');
        priceElements.each((_, el) => {
          const text = $(el).text();
          const match = text.match(/€\s*([\d.,]+)/);
          if (match && !nettoPrice) {
            nettoPrice = parseFloat(match[1].replace('.', '').replace(',', '.'));
          }
        });
      }

      // Extract specs from the kenmerken table
      const specs = {};
      $('table').each((_, table) => {
        $(table).find('tr').each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            const key = $(cells[0]).text().trim();
            const value = $(cells[1]).text().trim();
            if (key && value) {
              specs[key] = value;
            }
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
      const response = await client.get(`/zoekresultaten?q=${encodeURIComponent(query)}`);
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
