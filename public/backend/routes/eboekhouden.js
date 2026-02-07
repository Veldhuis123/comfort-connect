const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// e-Boekhouden REST API v1 configuration
const EBOEKHOUDEN_API_URL = 'https://api.e-boekhouden.nl/v1';

// Session token cache (in productie beter in Redis/database)
let sessionCache = {
  token: null,
  expiresAt: null
};

// =============================================
// Helper: Get or refresh session token
// =============================================
const getSessionToken = async () => {
  // Check if we have a valid cached session
  if (sessionCache.token && sessionCache.expiresAt && new Date() < sessionCache.expiresAt) {
    return sessionCache.token;
  }

  const apiToken = process.env.EBOEKHOUDEN_API_TOKEN;
  if (!apiToken) {
    throw new Error('EBOEKHOUDEN_API_TOKEN niet geconfigureerd in .env');
  }

  // Create new session
  const response = await fetch(`${EBOEKHOUDEN_API_URL}/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken: apiToken,
      source: 'RVInstall'
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`e-Boekhouden sessie fout: ${error.message || response.status}`);
  }

  const data = await response.json();
  
  // Cache session token (use expiresIn from response, or default to 55 minutes)
  sessionCache.token = data.token;
  const expiresInMs = (data.expiresIn || 3300) * 1000; // Convert seconds to ms
  sessionCache.expiresAt = new Date(Date.now() + expiresInMs - 60000); // Buffer of 1 minute
  
  return data.token;
};

// =============================================
// Helper: Make authenticated API request
// =============================================
const apiRequest = async (method, endpoint, body = null) => {
  const sessionToken = await getSessionToken();
  
  const options = {
    method,
    headers: {
      'Authorization': sessionToken,
      'Content-Type': 'application/json',
    }
  };
  
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${EBOEKHOUDEN_API_URL}${endpoint}`, options);
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const errorMsg = data.message || data.error || `API fout: ${response.status}`;
    throw new Error(errorMsg);
  }
  
  return data;
};

// =============================================
// Test connection
// =============================================
router.get('/test', authMiddleware, async (req, res) => {
  try {
    // Check if API token is configured
    const apiToken = process.env.EBOEKHOUDEN_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ 
        error: 'EBOEKHOUDEN_API_TOKEN niet geconfigureerd in .env',
        details: 'Voeg EBOEKHOUDEN_API_TOKEN toe aan je .env bestand'
      });
    }

    // Try to create session first
    console.log('Testing e-Boekhouden connection...');
    console.log('API Token present:', !!apiToken, 'Length:', apiToken.length);
    
    const sessionResponse = await fetch(`${EBOEKHOUDEN_API_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: apiToken,
        source: 'RVInstall'
      })
    });

    const sessionData = await sessionResponse.json().catch(() => ({}));
    console.log('Session response status:', sessionResponse.status);
    console.log('Session response:', JSON.stringify(sessionData));

    if (!sessionResponse.ok) {
      return res.status(500).json({ 
        error: 'Sessie aanmaken mislukt',
        details: sessionData.message || sessionData.title || `Status: ${sessionResponse.status}`,
        code: sessionData.code
      });
    }

    if (!sessionData.token) {
      return res.status(500).json({ 
        error: 'Geen token ontvangen',
        details: 'Session response bevat geen token',
        response: sessionData
      });
    }

    // Update cache
    sessionCache.token = sessionData.token;
    const expiresInMs = (sessionData.expiresIn || 3300) * 1000;
    sessionCache.expiresAt = new Date(Date.now() + expiresInMs - 60000);

    // Try to get relations as a test (this works for normal users)
    const testResponse = await fetch(`${EBOEKHOUDEN_API_URL}/relation?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': sessionData.token,
        'Content-Type': 'application/json',
      }
    });

    const testData = await testResponse.json().catch(() => ({}));
    console.log('Test API call status:', testResponse.status);

    if (!testResponse.ok) {
      return res.status(500).json({ 
        error: 'API test mislukt',
        details: testData.message || testData.title || `Status: ${testResponse.status}`,
        code: testData.code
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Verbinding met e-Boekhouden succesvol',
      relaties: testData.count || 0
    });
  } catch (error) {
    console.error('e-Boekhouden test error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// =============================================
// Get administrations (to select which one to use)
// =============================================
router.get('/administraties', authMiddleware, async (req, res) => {
  try {
    const administrations = await apiRequest('GET', '/administration');
    res.json(administrations);
  } catch (error) {
    console.error('Get administraties error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// RELATIES (Klanten)
// =============================================

// Get all relations (customers) - WITH FULL DETAILS
router.get('/relaties', authMiddleware, async (req, res) => {
  console.log('=== GET /relaties called ===');
  try {
    const { limit = 100, offset = 0, name, code, type } = req.query;
    
    let endpoint = `/relation?limit=${limit}&offset=${offset}`;
    if (name) endpoint += `&name[like]=%${encodeURIComponent(name)}%`;
    if (code) endpoint += `&code=${encodeURIComponent(code)}`;
    if (type) endpoint += `&type=${type}`; // B = Bedrijf, P = Persoon
    
    console.log('Fetching from e-Boekhouden:', endpoint);
    const data = await apiRequest('GET', endpoint);
    console.log('e-Boekhouden response items count:', Array.isArray(data) ? data.length : (data.items?.length || 'unknown'));
    
    // Handle both array and object with items property
    const items = Array.isArray(data) ? data : (data.items || data.data || []);
    
    // The list endpoint only returns id, type, code - we need to fetch details for each
    // Fetch details in parallel (max 10 concurrent)
    const batchSize = 10;
    const allDetails = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const detailPromises = batch.map(async (item) => {
        try {
          const detail = await apiRequest('GET', `/relation/${item.id}`);
          
          // Log first detail for debugging
          if (i === 0 && batch.indexOf(item) === 0) {
            console.log('First relation detail:', JSON.stringify(detail, null, 2));
          }
          
          // API velden: phoneNumber, mobilePhoneNumber, emailAddress
          const telefoon = detail.phoneNumber || detail.mobilePhoneNumber || '';
          const mobiel = detail.mobilePhoneNumber || detail.phoneNumber || '';
          
          // type B = bedrijf, type P = particulier
          const isBedrijf = detail.type === 'B';
          
          return {
            id: detail.id,
            code: detail.code,
            type: detail.type, // B or P
            // Bedrijf: bij type B is dit de naam, bij type P leeg
            bedrijf: isBedrijf ? (detail.name || '') : '',
            // Contactpersoon: bij type P is name de persoonsnaam, bij type B is contact de contactpersoon
            contactpersoon: isBedrijf ? (detail.contact || '') : (detail.name || ''),
            email: detail.emailAddress || '',
            telefoon: telefoon,
            mobiel: mobiel,
            adres: detail.address || '',
            postcode: detail.postalCode || '',
            plaats: detail.city || '',
            land: detail.country || 'NL',
            iban: detail.iban || '',
            btwNummer: detail.vatNumber || '',
            kvkNummer: detail.companyRegistrationNumber || '',
            betalingstermijn: detail.termOfPayment || 14,
            notities: detail.note || '',
            actief: detail.inactive !== true
          };
        } catch (err) {
          console.error(`Failed to fetch details for relation ${item.id}:`, err.message);
          // Return basic info if detail fetch fails
          return {
            id: item.id,
            code: item.code,
            type: item.type,
            bedrijf: item.type === 'B' ? item.code : '',
            contactpersoon: item.type === 'P' ? item.code : '',
            email: '',
            telefoon: '',
            mobiel: '',
            adres: '',
            postcode: '',
            plaats: '',
            land: 'NL',
            actief: true
          };
        }
      });
      
      const batchResults = await Promise.all(detailPromises);
      allDetails.push(...batchResults);
    }
    
    res.json(allDetails);
  } catch (error) {
    console.error('Get relaties error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single relation
router.get('/relaties/:id', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', `/relation/${req.params.id}`);
    res.json({
      id: data.id,
      code: data.code,
      type: data.type,
      bedrijf: data.name,
      contactpersoon: data.contact,
      email: data.email,
      telefoon: data.phone,
      mobiel: data.mobile,
      adres: data.address,
      postcode: data.postalCode,
      plaats: data.city,
      land: data.country,
      iban: data.iban,
      btwNummer: data.vatNumber,
      kvkNummer: data.companyRegistrationNumber,
      betalingstermijn: data.termOfPayment,
      notities: data.note
    });
  } catch (error) {
    console.error('Get relatie error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new relation (customer) - NO DELETE, only ADD
router.post('/relaties', authMiddleware, async (req, res) => {
  try {
    const { 
      bedrijf, 
      contactpersoon, 
      email, 
      telefoon,
      mobiel,
      adres, 
      postcode, 
      plaats,
      land = 'NL',
      iban,
      btwNummer,
      kvkNummer,
      betalingstermijn = 14,
      type = 'B', // B = Bedrijf, P = Persoon
      notities
    } = req.body;

    if (!bedrijf) {
      return res.status(400).json({ error: 'Naam (bedrijf) is verplicht' });
    }

    const relationData = {
      name: bedrijf,
      type: type, // B or P
      contact: contactpersoon || null,
      email: email || null,
      phone: telefoon || null,
      mobile: mobiel || null,
      address: adres || null,
      postalCode: postcode || null,
      city: plaats || null,
      country: land,
      iban: iban || null,
      vatNumber: btwNummer || null,
      companyRegistrationNumber: kvkNummer || null,
      termOfPayment: betalingstermijn,
      note: notities || null
    };

    const result = await apiRequest('POST', '/relation', relationData);
    
    res.json({ 
      success: true, 
      id: result.id,
      code: result.code,
      message: 'Relatie toegevoegd aan e-Boekhouden' 
    });
  } catch (error) {
    console.error('Add relatie error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update relation
router.patch('/relaties/:id', authMiddleware, async (req, res) => {
  try {
    const { 
      bedrijf, 
      contactpersoon, 
      email, 
      telefoon,
      mobiel,
      adres, 
      postcode, 
      plaats,
      land,
      iban,
      btwNummer,
      kvkNummer,
      betalingstermijn,
      notities
    } = req.body;

    const updateData = {};
    if (bedrijf !== undefined) updateData.name = bedrijf;
    if (contactpersoon !== undefined) updateData.contact = contactpersoon;
    if (email !== undefined) updateData.email = email;
    if (telefoon !== undefined) updateData.phone = telefoon;
    if (mobiel !== undefined) updateData.mobile = mobiel;
    if (adres !== undefined) updateData.address = adres;
    if (postcode !== undefined) updateData.postalCode = postcode;
    if (plaats !== undefined) updateData.city = plaats;
    if (land !== undefined) updateData.country = land;
    if (iban !== undefined) updateData.iban = iban;
    if (btwNummer !== undefined) updateData.vatNumber = btwNummer;
    if (kvkNummer !== undefined) updateData.companyRegistrationNumber = kvkNummer;
    if (betalingstermijn !== undefined) updateData.termOfPayment = betalingstermijn;
    if (notities !== undefined) updateData.note = notities;

    await apiRequest('PATCH', `/relation/${req.params.id}`, updateData);
    
    res.json({ success: true, message: 'Relatie bijgewerkt' });
  } catch (error) {
    console.error('Update relatie error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// PRODUCTEN (Artikelen)
// =============================================

// Get all products
router.get('/producten', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, description, code } = req.query;
    
    let endpoint = `/product?limit=${limit}&offset=${offset}`;
    if (description) endpoint += `&description[like]=%${encodeURIComponent(description)}%`;
    if (code) endpoint += `&code=${encodeURIComponent(code)}`;
    
    const data = await apiRequest('GET', endpoint);
    
    const products = (data.items || data).map(prod => ({
      id: prod.id,
      code: prod.code,
      omschrijving: prod.description,
      groepId: prod.groupId,
      grootboekId: prod.ledgerId,
      eenheid: prod.unit,
      prijsExcl: prod.priceExcl,
      prijsIncl: prod.priceIncl,
      inkoopprijs: prod.purchasePriceExcl,
      btwCode: prod.vatCode,
      actief: prod.isActive !== false
    }));
    
    res.json(products);
  } catch (error) {
    console.error('Get producten error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product groups
router.get('/producten/groepen', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', '/product/groups');
    res.json(data);
  } catch (error) {
    console.error('Get product groepen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/producten/:id', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', `/product/${req.params.id}`);
    res.json({
      id: data.id,
      code: data.code,
      omschrijving: data.description,
      groepId: data.groupId,
      grootboekId: data.ledgerId,
      eenheid: data.unit,
      prijsExcl: data.priceExcl,
      prijsIncl: data.priceIncl,
      inkoopprijs: data.purchasePriceExcl,
      btwCode: data.vatCode,
      actief: data.isActive
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new product - NO DELETE, only ADD
router.post('/producten', authMiddleware, async (req, res) => {
  try {
    const { 
      code, 
      omschrijving, 
      grootboekId, // verplicht
      groepId,
      eenheid,
      prijsExcl,
      prijsIncl,
      inkoopprijs,
      btwCode = 'HOOG_VERK_21',
      kostplaatsId
    } = req.body;

    if (!omschrijving) {
      return res.status(400).json({ error: 'Omschrijving is verplicht' });
    }
    if (!code) {
      return res.status(400).json({ error: 'Product code is verplicht' });
    }
    if (!grootboekId) {
      return res.status(400).json({ error: 'Grootboek ID is verplicht' });
    }

    const productData = {
      code: code,
      description: omschrijving,
      ledgerId: grootboekId,
      groupId: groepId || null,
      unit: eenheid || null,
      vatCode: btwCode,
      costCenterId: kostplaatsId || null
    };

    // Either priceExcl or priceIncl is required
    if (prijsExcl !== undefined) {
      productData.priceExcl = prijsExcl;
    } else if (prijsIncl !== undefined) {
      productData.priceIncl = prijsIncl;
    } else {
      productData.priceExcl = 0;
    }

    if (inkoopprijs !== undefined) {
      productData.purchasePriceExcl = inkoopprijs;
    }

    const result = await apiRequest('POST', '/product', productData);
    
    res.json({ 
      success: true, 
      id: result.id,
      message: 'Product toegevoegd aan e-Boekhouden' 
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.patch('/producten/:id', authMiddleware, async (req, res) => {
  try {
    const { 
      code, 
      omschrijving, 
      grootboekId,
      groepId,
      eenheid,
      prijsExcl,
      prijsIncl,
      inkoopprijs,
      btwCode,
      kostplaatsId
    } = req.body;

    const updateData = {};
    if (code !== undefined) updateData.code = code;
    if (omschrijving !== undefined) updateData.description = omschrijving;
    if (grootboekId !== undefined) updateData.ledgerId = grootboekId;
    if (groepId !== undefined) updateData.groupId = groepId;
    if (eenheid !== undefined) updateData.unit = eenheid;
    if (prijsExcl !== undefined) updateData.priceExcl = prijsExcl;
    if (prijsIncl !== undefined) updateData.priceIncl = prijsIncl;
    if (inkoopprijs !== undefined) updateData.purchasePriceExcl = inkoopprijs;
    if (btwCode !== undefined) updateData.vatCode = btwCode;
    if (kostplaatsId !== undefined) updateData.costCenterId = kostplaatsId;

    await apiRequest('PATCH', `/product/${req.params.id}`, updateData);
    
    res.json({ success: true, message: 'Product bijgewerkt' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// OFFERTES (Quotes)
// =============================================

// Get all quotes
router.get('/offertes', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, dateFrom, dateTo, relationId } = req.query;
    
    let endpoint = `/quote?limit=${limit}&offset=${offset}`;
    if (dateFrom) endpoint += `&date[gte]=${dateFrom}`;
    if (dateTo) endpoint += `&date[lte]=${dateTo}`;
    if (relationId) endpoint += `&relationId=${relationId}`;
    
    const data = await apiRequest('GET', endpoint);
    
    const quotes = (data.items || data).map(q => ({
      id: q.id,
      offertenummer: q.quoteNumber,
      relatieId: q.relationId,
      datum: q.date,
      vervaldatum: q.expirationDate,
      totaalExcl: q.totalExcl,
      totaalBtw: q.totalVat,
      totaalIncl: q.totalIncl,
      status: q.status
    }));
    
    res.json(quotes);
  } catch (error) {
    console.error('Get offertes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new quote (offerte) - SAVES LOCALLY (e-Boekhouden has no quote API)
router.post('/offertes', authMiddleware, async (req, res) => {
  const db = require('../config/database');
  
  try {
    const { 
      relatieId,
      klantnaam,
      klantEmail,
      klantTelefoon,
      klantAdres,
      offertenummer,
      datum,
      vervaldatum,
      regels = [], // Array of { omschrijving, code, aantal, eenheid, prijsPerEenheid, btwPercentage }
      notitieKlant,
      notitieIntern,
      quoteRequestId // Link naar oorspronkelijke aanvraag
    } = req.body;

    if (!klantnaam && !relatieId) {
      return res.status(400).json({ error: 'Klantnaam of Relatie ID is verplicht' });
    }

    if (!regels || regels.length === 0) {
      return res.status(400).json({ error: 'Minimaal 1 offerteregel is verplicht' });
    }

    // Calculate totals
    let subtotalExcl = 0;
    let vatAmount = 0;
    
    regels.forEach(regel => {
      const lineTotal = (regel.aantal || 1) * (regel.prijsPerEenheid || 0);
      const lineVat = lineTotal * ((regel.btwPercentage || 21) / 100);
      subtotalExcl += lineTotal;
      vatAmount += lineVat;
    });
    
    const totalIncl = subtotalExcl + vatAmount;

    // Calculate dates
    const quoteDate = datum || new Date().toISOString().split('T')[0];
    let expirationDate = vervaldatum;
    if (!expirationDate) {
      const expDate = new Date(quoteDate);
      expDate.setDate(expDate.getDate() + 30);
      expirationDate = expDate.toISOString().split('T')[0];
    }

    // Generate quote number if not provided
    let quoteNumber = offertenummer;
    if (!quoteNumber) {
      const year = new Date().getFullYear();
      const [lastQuote] = await db.query(
        `SELECT quote_number FROM local_quotes 
         WHERE quote_number LIKE ? 
         ORDER BY id DESC LIMIT 1`,
        [`OFF-${year}-%`]
      );
      
      let nextNum = 1;
      if (lastQuote.length > 0 && lastQuote[0].quote_number) {
        const match = lastQuote[0].quote_number.match(/OFF-\d{4}-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      quoteNumber = `OFF-${year}-${String(nextNum).padStart(4, '0')}`;
    }

    // Insert quote
    const [quoteResult] = await db.query(
      `INSERT INTO local_quotes (
        relation_id, customer_name, customer_email, customer_phone, customer_address,
        quote_number, quote_date, expiration_date,
        subtotal_excl, vat_amount, total_incl,
        customer_note, internal_note, quote_request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        relatieId || null,
        klantnaam || 'Onbekend',
        klantEmail || null,
        klantTelefoon || null,
        klantAdres || null,
        quoteNumber,
        quoteDate,
        expirationDate,
        subtotalExcl.toFixed(2),
        vatAmount.toFixed(2),
        totalIncl.toFixed(2),
        notitieKlant || null,
        notitieIntern || null,
        quoteRequestId || null
      ]
    );

    const quoteId = quoteResult.insertId;

    // Insert quote items
    for (let i = 0; i < regels.length; i++) {
      const regel = regels[i];
      await db.query(
        `INSERT INTO local_quote_items (
          quote_id, description, product_code, quantity, unit, 
          price_per_unit, vat_code, vat_percentage, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quoteId,
          regel.omschrijving || 'Product',
          regel.code || null,
          regel.aantal || 1,
          regel.eenheid || 'stuk',
          regel.prijsPerEenheid || 0,
          regel.btwCode || 'HOOG_VERK_21',
          regel.btwPercentage || 21,
          i
        ]
      );
    }

    console.log(`Quote ${quoteNumber} saved locally (ID: ${quoteId})`);
    
    res.json({ 
      success: true, 
      id: quoteId,
      offertenummer: quoteNumber,
      totaalExcl: subtotalExcl.toFixed(2),
      btw: vatAmount.toFixed(2),
      totaalIncl: totalIncl.toFixed(2),
      message: 'Offerte lokaal opgeslagen. Je kunt deze later overnemen in e-Boekhouden.' 
    });
  } catch (error) {
    console.error('Add offerte error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =============================================
// FACTUREN (Invoices)
// =============================================

// Get all invoices
router.get('/facturen', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, dateFrom, dateTo, relationId, invoiceNumber } = req.query;
    
    let endpoint = `/invoice?limit=${limit}&offset=${offset}`;
    if (dateFrom) endpoint += `&date[gte]=${dateFrom}`;
    if (dateTo) endpoint += `&date[lte]=${dateTo}`;
    if (relationId) endpoint += `&relationId=${relationId}`;
    if (invoiceNumber) endpoint += `&invoiceNumber=${encodeURIComponent(invoiceNumber)}`;
    
    const data = await apiRequest('GET', endpoint);
    
    const invoices = (data.items || data).map(inv => ({
      id: inv.id,
      factuurnummer: inv.invoiceNumber,
      relatieId: inv.relationId,
      datum: inv.date,
      betalingstermijn: inv.termOfPayment,
      totaalExcl: inv.totalExcl,
      totaalBtw: inv.totalVat,
      totaalIncl: inv.totalIncl,
      openstaand: inv.outstanding,
      status: inv.status
    }));
    
    res.json(invoices);
  } catch (error) {
    console.error('Get facturen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single invoice
router.get('/facturen/:id', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', `/invoice/${req.params.id}`);
    res.json({
      id: data.id,
      factuurnummer: data.invoiceNumber,
      relatieId: data.relationId,
      datum: data.date,
      betalingstermijn: data.termOfPayment,
      totaalExcl: data.totalExcl,
      totaalBtw: data.totalVat,
      totaalIncl: data.totalIncl,
      openstaand: data.outstanding,
      regels: data.items?.map(item => ({
        omschrijving: item.description,
        code: item.code,
        aantal: item.quantity,
        prijsPerEenheid: item.pricePerUnit,
        btwCode: item.vatCode,
        totaal: item.total
      })) || []
    });
  } catch (error) {
    console.error('Get factuur error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get outstanding invoices
router.get('/facturen/openstaand/all', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', '/mutation/invoice/outstanding');
    res.json(data);
  } catch (error) {
    console.error('Get openstaande facturen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new invoice - NO DELETE, only ADD
router.post('/facturen', authMiddleware, async (req, res) => {
  try {
    const { 
      relatieId,
      factuurnummer, // optioneel, wordt anders automatisch gegenereerd
      datum,
      betalingstermijn = 14,
      btwType = 'EX', // IN of EX (inclusief/exclusief BTW)
      sjabloonId, // invoice template ID
      regels = [], // Array of { omschrijving, code, aantal, prijsPerEenheid, btwCode, grootboekId }
      opmerkingen
    } = req.body;

    if (!relatieId) {
      return res.status(400).json({ error: 'Relatie ID is verplicht' });
    }

    if (!regels || regels.length === 0) {
      return res.status(400).json({ error: 'Minimaal 1 factuurregel is verplicht' });
    }

    const invoiceData = {
      relationId: relatieId,
      date: datum || new Date().toISOString().split('T')[0],
      termOfPayment: betalingstermijn,
      vat: btwType,
      items: regels.map(regel => ({
        description: regel.omschrijving,
        code: regel.code || null,
        quantity: regel.aantal || 1,
        pricePerUnit: regel.prijsPerEenheid || 0,
        vatCode: regel.btwCode || 'HOOG_VERK_21',
        ledgerId: regel.grootboekId || null
      }))
    };

    if (factuurnummer) {
      invoiceData.invoiceNumber = factuurnummer;
    }
    if (sjabloonId) {
      invoiceData.templateId = sjabloonId;
    }
    if (opmerkingen) {
      invoiceData.invoiceText = opmerkingen;
    }

    const result = await apiRequest('POST', '/invoice', invoiceData);
    
    res.json({ 
      success: true, 
      id: result.id,
      factuurnummer: result.invoiceNumber,
      message: 'Factuur toegevoegd aan e-Boekhouden' 
    });
  } catch (error) {
    console.error('Add factuur error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GROOTBOEKREKENINGEN (Ledgers)
// =============================================

// Get all ledgers
router.get('/grootboek', authMiddleware, async (req, res) => {
  try {
    const { limit = 500, offset = 0, category } = req.query;
    
    let endpoint = `/ledger?limit=${limit}&offset=${offset}`;
    if (category) endpoint += `&category=${category}`;
    
    const data = await apiRequest('GET', endpoint);
    
    const ledgers = (data.items || data).map(led => ({
      id: led.id,
      code: led.code,
      omschrijving: led.description,
      categorie: led.category,
      groep: led.group
    }));
    
    res.json(ledgers);
  } catch (error) {
    console.error('Get grootboek error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ledger balance
router.get('/grootboek/:id/saldo', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', `/ledger/${req.params.id}/balance`);
    res.json(data);
  } catch (error) {
    console.error('Get grootboek saldo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// KOSTPLAATSEN (Cost Centers)
// =============================================

// Get all cost centers
router.get('/kostplaatsen', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', '/costcenter');
    res.json(data);
  } catch (error) {
    console.error('Get kostplaatsen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add cost center
router.post('/kostplaatsen', authMiddleware, async (req, res) => {
  try {
    const { omschrijving, parentId } = req.body;

    if (!omschrijving) {
      return res.status(400).json({ error: 'Omschrijving is verplicht' });
    }

    const result = await apiRequest('POST', '/costcenter', {
      description: omschrijving,
      parentId: parentId || null
    });
    
    res.json({ success: true, id: result.id, message: 'Kostplaats toegevoegd' });
  } catch (error) {
    console.error('Add kostplaats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// EENHEDEN (Units)
// =============================================

// Get all units
router.get('/eenheden', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', '/unit');
    res.json(data);
  } catch (error) {
    console.error('Get eenheden error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// FACTUUR SJABLONEN (Invoice Templates)
// =============================================

// Get all invoice templates
router.get('/sjablonen/facturen', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', '/invoicetemplate');
    res.json(data);
  } catch (error) {
    console.error('Get factuur sjablonen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all email templates
router.get('/sjablonen/email', authMiddleware, async (req, res) => {
  try {
    const data = await apiRequest('GET', '/emailtemplate');
    res.json(data);
  } catch (error) {
    console.error('Get email sjablonen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// BOEKINGEN (Mutations)
// =============================================

// Get mutations
router.get('/boekingen', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, dateFrom, dateTo, type, ledgerId } = req.query;
    
    let endpoint = `/mutation?limit=${limit}&offset=${offset}`;
    if (dateFrom) endpoint += `&date[gte]=${dateFrom}`;
    if (dateTo) endpoint += `&date[lte]=${dateTo}`;
    if (type) endpoint += `&type=${type}`;
    if (ledgerId) endpoint += `&ledgerId=${ledgerId}`;
    
    const data = await apiRequest('GET', endpoint);
    res.json(data);
  } catch (error) {
    console.error('Get boekingen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add mutation
router.post('/boekingen', authMiddleware, async (req, res) => {
  try {
    const { 
      type, // FactuurOntvangen, FactuurVerstuurd, FactuurBetaling, etc.
      datum,
      grootboekId,
      relatieId,
      factuurnummer,
      omschrijving,
      bedrag,
      btwCode,
      regels = []
    } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type is verplicht' });
    }

    const mutationData = {
      type: type,
      date: datum || new Date().toISOString().split('T')[0],
      ledgerId: grootboekId,
      relationId: relatieId || null,
      invoiceNumber: factuurnummer || null,
      description: omschrijving || null,
      rows: regels.length > 0 ? regels.map(regel => ({
        ledgerId: regel.grootboekId,
        credit: regel.credit || 0,
        debit: regel.debit || 0,
        vatCode: regel.btwCode || null,
        description: regel.omschrijving || null
      })) : undefined
    };

    const result = await apiRequest('POST', '/mutation', mutationData);
    
    res.json({ success: true, id: result.id, message: 'Boeking toegevoegd' });
  } catch (error) {
    console.error('Add boeking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// SYNC FROM LOCAL DB - Quote to e-Boekhouden
// =============================================

router.post('/sync/quote/:quoteId', authMiddleware, async (req, res) => {
  const db = require('../config/database');
  
  try {
    const { quoteId } = req.params;
    
    // Get quote from local database
    const [quotes] = await db.query(
      'SELECT * FROM quote_requests WHERE id = ?',
      [quoteId]
    );
    
    if (quotes.length === 0) {
      return res.status(404).json({ error: 'Offerte niet gevonden' });
    }
    
    const quote = quotes[0];
    
    // Check if customer exists or create new
    let relatieId = quote.eboekhouden_relatie_id;
    
    if (!relatieId && quote.customer_name) {
      // Create new customer in e-Boekhouden
      const customerResult = await apiRequest('POST', '/relation', {
        name: quote.customer_name,
        type: 'P', // Persoon
        email: quote.customer_email || null,
        phone: quote.customer_phone || null,
        termOfPayment: 14
      });
      
      relatieId = customerResult.id;
      
      // Save relatie ID to local database
      await db.query(
        'UPDATE quote_requests SET eboekhouden_relatie_id = ? WHERE id = ?',
        [relatieId, quoteId]
      );
    }
    
    res.json({ 
      success: true, 
      relatieId,
      message: 'Klant gesynchroniseerd naar e-Boekhouden'
    });
  } catch (error) {
    console.error('Sync quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// LOKALE OFFERTES - CRUD
// =============================================

// Get all local quotes
router.get('/local-quotes', authMiddleware, async (req, res) => {
  const db = require('../config/database');
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT q.*, 
        (SELECT COUNT(*) FROM local_quote_items WHERE quote_id = q.id) as item_count
      FROM local_quotes q
    `;
    const params = [];
    
    if (status) {
      query += ' WHERE q.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [quotes] = await db.query(query, params);
    
    // Get stats
    const [statsTotal] = await db.query('SELECT COUNT(*) as count FROM local_quotes');
    const [statsByStatus] = await db.query(
      'SELECT status, COUNT(*) as count FROM local_quotes GROUP BY status'
    );
    
    res.json({
      quotes,
      stats: {
        total: statsTotal[0].count,
        byStatus: statsByStatus.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get local quotes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single local quote with items
router.get('/local-quotes/:id', authMiddleware, async (req, res) => {
  const db = require('../config/database');
  try {
    const { id } = req.params;
    
    const [quotes] = await db.query(
      'SELECT * FROM local_quotes WHERE id = ?',
      [id]
    );
    
    if (quotes.length === 0) {
      return res.status(404).json({ error: 'Offerte niet gevonden' });
    }
    
    const [items] = await db.query(
      'SELECT * FROM local_quote_items WHERE quote_id = ? ORDER BY sort_order',
      [id]
    );
    
    res.json({ ...quotes[0], items });
  } catch (error) {
    console.error('Get local quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update local quote status
router.patch('/local-quotes/:id/status', authMiddleware, async (req, res) => {
  const db = require('../config/database');
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['concept', 'verzonden', 'geaccepteerd', 'afgewezen', 'verlopen', 'overgenomen'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Ongeldige status' });
    }
    
    const updates = { status };
    
    // Set timestamps based on status
    if (status === 'verzonden') {
      updates.sent_at = new Date();
    } else if (status === 'geaccepteerd') {
      updates.accepted_at = new Date();
    } else if (status === 'overgenomen') {
      updates.eboekhouden_synced_at = new Date();
    }
    
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    await db.query(`UPDATE local_quotes SET ${setClause} WHERE id = ?`, values);
    
    res.json({ success: true, message: 'Status bijgewerkt' });
  } catch (error) {
    console.error('Update local quote status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update local quote
router.patch('/local-quotes/:id', authMiddleware, async (req, res) => {
  const db = require('../config/database');
  try {
    const { id } = req.params;
    const { customer_note, internal_note, expiration_date } = req.body;
    
    const updates = {};
    if (customer_note !== undefined) updates.customer_note = customer_note;
    if (internal_note !== undefined) updates.internal_note = internal_note;
    if (expiration_date !== undefined) updates.expiration_date = expiration_date;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Geen wijzigingen opgegeven' });
    }
    
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    await db.query(`UPDATE local_quotes SET ${setClause} WHERE id = ?`, values);
    
    res.json({ success: true, message: 'Offerte bijgewerkt' });
  } catch (error) {
    console.error('Update local quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete local quote
router.delete('/local-quotes/:id', authMiddleware, async (req, res) => {
  const db = require('../config/database');
  try {
    const { id } = req.params;
    
    // Items worden automatisch verwijderd via CASCADE
    await db.query('DELETE FROM local_quotes WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Offerte verwijderd' });
  } catch (error) {
    console.error('Delete local quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// Clear session cache (useful for testing)
// =============================================
router.post('/session/clear', authMiddleware, async (req, res) => {
  sessionCache = { token: null, expiresAt: null };
  res.json({ success: true, message: 'Sessie cache geleegd' });
});

module.exports = router;
