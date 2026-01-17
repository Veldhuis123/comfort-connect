const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// e-Boekhouden API configuration
const EBOEKHOUDEN_API_URL = 'https://soap.e-boekhouden.nl/soap.asmx';
const EBOEKHOUDEN_WSDL = 'https://soap.e-boekhouden.nl/soap.asmx?WSDL';

// Helper function to make SOAP requests to e-Boekhouden
const soapRequest = async (method, params) => {
  const username = process.env.EBOEKHOUDEN_USERNAME;
  const securityCode1 = process.env.EBOEKHOUDEN_CODE1;
  const securityCode2 = process.env.EBOEKHOUDEN_CODE2;

  if (!username || !securityCode1 || !securityCode2) {
    throw new Error('e-Boekhouden credentials niet geconfigureerd');
  }

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="http://www.e-boekhouden.nl/soap">
      <Username>${username}</Username>
      <SecurityCode1>${securityCode1}</SecurityCode1>
      <SecurityCode2>${securityCode2}</SecurityCode2>
      ${params}
    </${method}>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(EBOEKHOUDEN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `http://www.e-boekhouden.nl/soap/${method}`,
    },
    body: soapEnvelope,
  });

  if (!response.ok) {
    throw new Error(`e-Boekhouden API error: ${response.status}`);
  }

  return response.text();
};

// Parse simple XML value
const parseXmlValue = (xml, tag) => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
};

// Parse multiple XML elements
const parseXmlElements = (xml, containerTag, itemTag) => {
  const containerRegex = new RegExp(`<${containerTag}[^>]*>([\\s\\S]*?)<\\/${containerTag}>`, 'gi');
  const items = [];
  let match;
  
  while ((match = containerRegex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  
  return items;
};

// Test connection
router.get('/test', authMiddleware, async (req, res) => {
  try {
    const result = await soapRequest('OpenSession', '');
    const sessionId = parseXmlValue(result, 'SessionID');
    
    if (sessionId) {
      // Close session
      await soapRequest('CloseSession', `<SessionID>${sessionId}</SessionID>`);
      res.json({ success: true, message: 'Verbinding met e-Boekhouden succesvol' });
    } else {
      throw new Error('Geen sessie ID ontvangen');
    }
  } catch (error) {
    console.error('e-Boekhouden test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RELATIES (Klanten) ====================

// Get all relations (customers)
router.get('/relaties', authMiddleware, async (req, res) => {
  try {
    const result = await soapRequest('GetRelaties', `
      <cFilter>
        <Trefwoord></Trefwoord>
        <Code></Code>
        <ID>0</ID>
      </cFilter>
    `);
    
    // Parse relations from XML response
    const relations = [];
    const relItems = parseXmlElements(result, 'cRelatie', 'cRelatie');
    
    relItems.forEach(item => {
      relations.push({
        id: parseXmlValue(item, 'ID'),
        code: parseXmlValue(item, 'Code'),
        bedrijf: parseXmlValue(item, 'Bedrijf'),
        contactpersoon: parseXmlValue(item, 'Contactpersoon'),
        email: parseXmlValue(item, 'Email'),
        telefoon: parseXmlValue(item, 'Telefoon'),
        adres: parseXmlValue(item, 'Adres'),
        postcode: parseXmlValue(item, 'Postcode'),
        plaats: parseXmlValue(item, 'Plaats'),
      });
    });
    
    res.json(relations);
  } catch (error) {
    console.error('Get relaties error:', error);
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
      adres, 
      postcode, 
      plaats,
      land = 'NL',
      bpType = 'K' // K = Klant
    } = req.body;

    if (!bedrijf && !contactpersoon) {
      return res.status(400).json({ error: 'Bedrijf of contactpersoon is verplicht' });
    }

    const result = await soapRequest('AddRelatie', `
      <oRel>
        <ID>0</ID>
        <AddDatum>${new Date().toISOString().split('T')[0]}</AddDatum>
        <Code></Code>
        <Bedrijf>${bedrijf || ''}</Bedrijf>
        <Contactpersoon>${contactpersoon || ''}</Contactpersoon>
        <Geslacht></Geslacht>
        <Adres>${adres || ''}</Adres>
        <Postcode>${postcode || ''}</Postcode>
        <Plaats>${plaats || ''}</Plaats>
        <Land>${land}</Land>
        <Adres2></Adres2>
        <Postcode2></Postcode2>
        <Plaats2></Plaats2>
        <Land2></Land2>
        <Telefoon>${telefoon || ''}</Telefoon>
        <GSM></GSM>
        <FAX></FAX>
        <Email>${email || ''}</Email>
        <Site></Site>
        <Notitie></Notitie>
        <Bankrekening></Bankrekening>
        <Girorekening></Girorekening>
        <BTWNummer></BTWNummer>
        <KvkNummer></KvkNummer>
        <Aanhef></Aanhef>
        <IBAN></IBAN>
        <BIC></BIC>
        <BP>${bpType}</BP>
        <Def1></Def1>
        <Def2></Def2>
        <Def3></Def3>
        <Def4></Def4>
        <Def5></Def5>
        <Def6></Def6>
        <Def7></Def7>
        <Def8></Def8>
        <Def9></Def9>
        <Def10></Def10>
        <LA></LA>
        <Gb_ID>0</Gb_ID>
        <GesssId>0</GeenDoos>
        <NieijsID></NieijsID>
      </oRel>
    `);
    
    const newId = parseXmlValue(result, 'Mut_ID');
    res.json({ success: true, id: newId, message: 'Relatie toegevoegd aan e-Boekhouden' });
  } catch (error) {
    console.error('Add relatie error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ARTIKELEN (Producten) ====================

// Get all articles (products)
router.get('/artikelen', authMiddleware, async (req, res) => {
  try {
    const result = await soapRequest('GetArtikelen', `
      <cFilter>
        <ArtikelID>0</ArtikelID>
        <ArtikelOmschrijving></ArtikelOmschrijving>
        <ArtikelCode></ArtikelCode>
        <GroepOmschrijving></GroepOmschrijving>
        <GroepCode></GroepCode>
      </cFilter>
    `);
    
    const articles = [];
    const artItems = parseXmlElements(result, 'cArtikel', 'cArtikel');
    
    artItems.forEach(item => {
      articles.push({
        id: parseXmlValue(item, 'ArtikelID'),
        code: parseXmlValue(item, 'ArtikelCode'),
        omschrijving: parseXmlValue(item, 'ArtikelOmschrijving'),
        groep: parseXmlValue(item, 'GroepOmschrijving'),
        eenheid: parseXmlValue(item, 'Eenheid'),
        inkoopprijs: parseFloat(parseXmlValue(item, 'InkoopprijsExclBTW') || 0),
        verkoopprijs: parseFloat(parseXmlValue(item, 'VerkoopprijsExclBTW') || 0),
        btwCode: parseXmlValue(item, 'BTWCode'),
      });
    });
    
    res.json(articles);
  } catch (error) {
    console.error('Get artikelen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new article (product) - NO DELETE, only ADD
router.post('/artikelen', authMiddleware, async (req, res) => {
  try {
    const { 
      code, 
      omschrijving, 
      groep = '',
      eenheid = 'stuk',
      inkoopprijs = 0,
      verkoopprijs = 0,
      btwCode = 'HOOG_VERK_21'
    } = req.body;

    if (!omschrijving) {
      return res.status(400).json({ error: 'Omschrijving is verplicht' });
    }

    const result = await soapRequest('AddArtikel', `
      <oArt>
        <ArtikelID>0</ArtikelID>
        <ArtikelOmschrijving>${omschrijving}</ArtikelOmschrijving>
        <ArtikelCode>${code || ''}</ArtikelCode>
        <GroepOmschrijving>${groep}</GroepOmschrijving>
        <GroepCode></GroepCode>
        <Eenheid>${eenheid}</Eenheid>
        <InkoopprijsExclBTW>${inkoopprijs}</InkoopprijsExclBTW>
        <VerkoopprijsExclBTW>${verkoopprijs}</VerkoopprijsExclBTW>
        <VerkoopprijsInclBTW>0</VerkoopprijsInclBTW>
        <BTWCode>${btwCode}</BTWCode>
        <TesrseN></TeresN>
        <KortsingsPercEntage>0</KortingsPercentage>
        <Voorraad_DashBord>false</Voorraad_DashBord>
        <Actief>true</Actief>
      </oArt>
    `);
    
    const newId = parseXmlValue(result, 'Mut_ID');
    res.json({ success: true, id: newId, message: 'Artikel toegevoegd aan e-Boekhouden' });
  } catch (error) {
    console.error('Add artikel error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== FACTUREN ====================

// Get all invoices
router.get('/facturen', authMiddleware, async (req, res) => {
  try {
    const { van, tot } = req.query;
    const fromDate = van || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = tot || new Date().toISOString().split('T')[0];

    const result = await soapRequest('GetFacturen', `
      <cFilter>
        <Factuurnummer></Factuurnummer>
        <Relatiecode></Relatiecode>
        <DatumVan>${fromDate}</DatumVan>
        <DatumTm>${toDate}</DatumTm>
      </cFilter>
    `);
    
    const invoices = [];
    const invItems = parseXmlElements(result, 'cFactuurList', 'cFactuurList');
    
    invItems.forEach(item => {
      invoices.push({
        factuurnummer: parseXmlValue(item, 'Factuurnummer'),
        relatiecode: parseXmlValue(item, 'Relatiecode'),
        datum: parseXmlValue(item, 'Datum'),
        betalingstermijn: parseXmlValue(item, 'Betalingstermijn'),
        totaalExclBTW: parseFloat(parseXmlValue(item, 'TotaalExclBTW') || 0),
        totaalBTW: parseFloat(parseXmlValue(item, 'TotaalBTW') || 0),
        totaalInclBTW: parseFloat(parseXmlValue(item, 'TotaalInclBTW') || 0),
        totaalOpenstaand: parseFloat(parseXmlValue(item, 'TotaalOpenstaand') || 0),
      });
    });
    
    res.json(invoices);
  } catch (error) {
    console.error('Get facturen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new invoice - NO DELETE, only ADD
router.post('/facturen', authMiddleware, async (req, res) => {
  try {
    const { 
      relatiecode,
      datum,
      betalingstermijn = 14,
      regels = [], // Array of { omschrijving, aantal, prijs, btwCode }
      opmerkingen = ''
    } = req.body;

    if (!relatiecode) {
      return res.status(400).json({ error: 'Relatiecode is verplicht' });
    }

    if (!regels || regels.length === 0) {
      return res.status(400).json({ error: 'Minimaal 1 factuurregel is verplicht' });
    }

    // Build invoice lines XML
    const regelsXml = regels.map(regel => `
      <cFactuurRegel>
        <Aantal>${regel.aantal || 1}</Aantal>
        <Eenheid>${regel.eenheid || 'stuk'}</Eenheid>
        <Code>${regel.code || ''}</Code>
        <Omschrijving>${regel.omschrijving}</Omschrijving>
        <PrijsPerEenheid>${regel.prijs || 0}</PrijsPerEenheid>
        <BTWCode>${regel.btwCode || 'HOOG_VERK_21'}</BTWCode>
        <TesrseN></TeresN>
        <KosPtlaats></Kostplaats>
      </cFactuurRegel>
    `).join('');

    const result = await soapRequest('AddFactuur', `
      <oFact>
        <Factuurnummer></Factuurnummer>
        <Relatiecode>${relatiecode}</Relatiecode>
        <Datum>${datum || new Date().toISOString().split('T')[0]}</Datum>
        <Betalingstermijn>${betalingstermijn}</Betalingstermijn>
        <PerEmailVerzwordn>false</PerEmailVerzenden>
        <EmailOnderwerp></EmailOnderwerp>
        <EmailBericht></EmailBericht>
        <EmailVanAdres></EmailVanAdres>
        <EmailVanNaam></EmailVanNaam>
        <AutomatischeIncasso>false</AutomatischeIncasso>
        <IncassoMachtigingsDatum></IncassoMachtigingsDatum>
        <IncassoMachtigingSoort></IncassoMachtigingSoort>
        <IncassoMachtigingID></IncassoMachtigingID>
        <IncassoMachtigingDatumOndwordk></IncassoMachtigingDatumOndertekening>
        <IncassoMachtigingFirst>false</IncassoMachtigingFirst>
        <IncassoRekeningNummer></IncassoRekeningNummer>
        <IncassoTnv></IncassoTnv>
        <IncassoPlaats></IncassoPlaats>
        <IncassoOmschrijvingRegel1></IncassoOmschrijvingRegel1>
        <IncassoOmschrijvingRegel2></IncassoOmschrijvingRegel2>
        <IncassoOmschrijvingRegel3></IncassoOmschrijvingRegel3>
        <InhsssSSCode></InhsssSSCode>
        <Opmerking>${opmerkingen}</Opmerking>
        <Regels>
          ${regelsXml}
        </Regels>
      </oFact>
    `);
    
    const newId = parseXmlValue(result, 'Factuurnummer');
    res.json({ success: true, factuurnummer: newId, message: 'Factuur toegevoegd aan e-Boekhouden' });
  } catch (error) {
    console.error('Add factuur error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYNC FROM LOCAL DB ====================

// Sync a quote to e-Boekhouden (create customer + invoice)
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
    let relatieCode = quote.eboekhouden_relatie_code;
    
    if (!relatieCode && quote.customer_email) {
      // Create new customer in e-Boekhouden
      const customerResult = await soapRequest('AddRelatie', `
        <oRel>
          <ID>0</ID>
          <AddDatum>${new Date().toISOString().split('T')[0]}</AddDatum>
          <Code></Code>
          <Bedrijf></Bedrijf>
          <Contactpersoon>${quote.customer_name || ''}</Contactpersoon>
          <Telefoon>${quote.customer_phone || ''}</Telefoon>
          <Email>${quote.customer_email}</Email>
          <BP>K</BP>
        </oRel>
      `);
      
      relatieCode = parseXmlValue(customerResult, 'Mut_ID');
      
      // Save relatie code to local database
      await db.query(
        'UPDATE quote_requests SET eboekhouden_relatie_code = ? WHERE id = ?',
        [relatieCode, quoteId]
      );
    }
    
    res.json({ 
      success: true, 
      relatieCode,
      message: 'Offerte gesynchroniseerd naar e-Boekhouden'
    });
  } catch (error) {
    console.error('Sync quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
