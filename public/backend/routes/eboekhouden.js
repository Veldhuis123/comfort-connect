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
      source: 'RV-Installatie-App'
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
    // Test by getting administrations
    const administrations = await apiRequest('GET', '/administration');
    
    res.json({ 
      success: true, 
      message: 'Verbinding met e-Boekhouden succesvol',
      administraties: administrations.length || 0
    });
  } catch (error) {
    console.error('e-Boekhouden test error:', error);
    res.status(500).json({ error: error.message });
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

// Get all relations (customers)
router.get('/relaties', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, name, code, type } = req.query;
    
    let endpoint = `/relation?limit=${limit}&offset=${offset}`;
    if (name) endpoint += `&name[like]=%${encodeURIComponent(name)}%`;
    if (code) endpoint += `&code=${encodeURIComponent(code)}`;
    if (type) endpoint += `&type=${type}`; // B = Bedrijf, P = Persoon
    
    const data = await apiRequest('GET', endpoint);
    
    // Map to consistent format
    const relations = (data.items || data).map(rel => ({
      id: rel.id,
      code: rel.code,
      type: rel.type, // B or P
      bedrijf: rel.name,
      contactpersoon: rel.contact,
      email: rel.email,
      telefoon: rel.phone,
      mobiel: rel.mobile,
      adres: rel.address,
      postcode: rel.postalCode,
      plaats: rel.city,
      land: rel.country,
      iban: rel.iban,
      btwNummer: rel.vatNumber,
      kvkNummer: rel.companyRegistrationNumber,
      betalingstermijn: rel.termOfPayment,
      notities: rel.note,
      actief: rel.isActive !== false
    }));
    
    res.json(relations);
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
// Clear session cache (useful for testing)
// =============================================
router.post('/session/clear', authMiddleware, async (req, res) => {
  sessionCache = { token: null, expiresAt: null };
  res.json({ success: true, message: 'Sessie cache geleegd' });
});

module.exports = router;
