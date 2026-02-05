const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const logger = require('../services/logger');
const { sendFaultNotification, sendEquipmentExpiringNotification } = require('../services/email');

// =============================================
// CUSTOMERS
// =============================================

// Get all customers
router.get('/customers', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM customers ORDER BY contact_name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Kon klanten niet ophalen' });
  }
});

// Create customer
router.post('/customers', authMiddleware, async (req, res) => {
  const { company_name, contact_name, email, phone, address_street, address_number, address_postal, address_city, notes } = req.body;
  
  try {
    const [result] = await pool.query(
      `INSERT INTO customers (company_name, contact_name, email, phone, address_street, address_number, address_postal, address_city, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_name, contact_name, email, phone, address_street, address_number, address_postal, address_city, notes]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Kon klant niet aanmaken' });
  }
});

// Update customer
router.put('/customers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { company_name, contact_name, email, phone, address_street, address_number, address_postal, address_city, notes } = req.body;
  
  try {
    await pool.query(
      `UPDATE customers SET company_name = ?, contact_name = ?, email = ?, phone = ?, 
       address_street = ?, address_number = ?, address_postal = ?, address_city = ?, notes = ?
       WHERE id = ?`,
      [company_name, contact_name, email, phone, address_street, address_number, address_postal, address_city, notes, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Kon klant niet bijwerken' });
  }
});

// Delete customer
router.delete('/customers/:id', authMiddleware, async (req, res) => {
  try {
    // Check if customer has installations
    const [installations] = await pool.query(
      'SELECT COUNT(*) as count FROM installations WHERE customer_id = ?',
      [req.params.id]
    );
    
    if (installations[0].count > 0) {
      return res.status(400).json({ 
        error: 'Kan klant niet verwijderen: er zijn nog installaties gekoppeld. Verwijder eerst de installaties.' 
      });
    }
    
    await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Kon klant niet verwijderen' });
  }
});

// =============================================
// TECHNICIANS
// =============================================

// Get all technicians
router.get('/technicians', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM technicians ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching technicians:', err);
    res.status(500).json({ error: 'Kon monteurs niet ophalen' });
  }
});

// Create technician
router.post('/technicians', authMiddleware, async (req, res) => {
  const { name, email, phone, fgas_certificate_number, fgas_certificate_expires, brl_certificate_number, brl_certificate_expires } = req.body;
  
  try {
    const [result] = await pool.query(
      `INSERT INTO technicians (name, email, phone, fgas_certificate_number, fgas_certificate_expires, brl_certificate_number, brl_certificate_expires)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, fgas_certificate_number, fgas_certificate_expires, brl_certificate_number, brl_certificate_expires]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Error creating technician:', err);
    res.status(500).json({ error: 'Kon monteur niet aanmaken' });
  }
});

// Update technician
router.put('/technicians/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, fgas_certificate_number, fgas_certificate_expires, brl_certificate_number, brl_certificate_expires, is_active } = req.body;
  
  try {
    await pool.query(
      `UPDATE technicians SET name = ?, email = ?, phone = ?, fgas_certificate_number = ?, 
       fgas_certificate_expires = ?, brl_certificate_number = ?, brl_certificate_expires = ?, is_active = ?
       WHERE id = ?`,
      [name, email, phone, fgas_certificate_number, fgas_certificate_expires, brl_certificate_number, brl_certificate_expires, is_active, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating technician:', err);
    res.status(500).json({ error: 'Kon monteur niet bijwerken' });
  }
});

// Delete technician
router.delete('/technicians/:id', authMiddleware, async (req, res) => {
  try {
    // Check if technician has installations
    const [installations] = await pool.query(
      'SELECT COUNT(*) as count FROM installations WHERE installed_by_technician_id = ?',
      [req.params.id]
    );
    
    if (installations[0].count > 0) {
      return res.status(400).json({ 
        error: 'Kan monteur niet verwijderen: er zijn nog installaties gekoppeld.' 
      });
    }
    
    await pool.query('DELETE FROM technicians WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting technician:', err);
    res.status(500).json({ error: 'Kon monteur niet verwijderen' });
  }
});

// =============================================
// EQUIPMENT (BRL 100 tools)
// =============================================

// Get all equipment
router.get('/equipment', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM equipment ORDER BY equipment_type, name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching equipment:', err);
    res.status(500).json({ error: 'Kon gereedschap niet ophalen' });
  }
});

// Create equipment
router.post('/equipment', authMiddleware, async (req, res) => {
  const { equipment_type, name, brand, serial_number, calibration_date, calibration_valid_until, notes } = req.body;
  
  try {
    const [result] = await pool.query(
      `INSERT INTO equipment (equipment_type, name, brand, serial_number, calibration_date, calibration_valid_until, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [equipment_type, name, brand, serial_number, calibration_date, calibration_valid_until, notes]
    );
    logger.audit('EQUIPMENT_CREATED', { 
      equipmentId: result.insertId, 
      equipmentType: equipment_type, 
      serialNumber: serial_number 
    }, req);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Error creating equipment:', err);
    res.status(500).json({ error: 'Kon gereedschap niet aanmaken' });
  }
});

// Update equipment
router.put('/equipment/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { equipment_type, name, brand, serial_number, calibration_date, calibration_valid_until, notes, is_active } = req.body;
  
  try {
    await pool.query(
      `UPDATE equipment SET equipment_type = ?, name = ?, brand = ?, serial_number = ?, 
       calibration_date = ?, calibration_valid_until = ?, notes = ?, is_active = ?
       WHERE id = ?`,
      [equipment_type, name, brand, serial_number, calibration_date, calibration_valid_until, notes, is_active, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating equipment:', err);
    res.status(500).json({ error: 'Kon gereedschap niet bijwerken' });
  }
});

// Delete equipment
router.delete('/equipment/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM equipment WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting equipment:', err);
    res.status(500).json({ error: 'Kon gereedschap niet verwijderen' });
  }
});

// =============================================
// REFRIGERANT CYLINDERS
// =============================================

// Get all cylinders
router.get('/cylinders', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM refrigerant_cylinders WHERE is_active = 1 ORDER BY refrigerant_type, status ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching cylinders:', err);
    res.status(500).json({ error: 'Kon cilinders niet ophalen' });
  }
});

// Create cylinder
router.post('/cylinders', authMiddleware, async (req, res) => {
  const { refrigerant_type, refrigerant_gwp, cylinder_size_kg, current_weight_kg, tare_weight_kg, batch_number, supplier, purchase_date, expiry_date, location, status, notes } = req.body;
  
  try {
    const [result] = await pool.query(
      `INSERT INTO refrigerant_cylinders (refrigerant_type, refrigerant_gwp, cylinder_size_kg, current_weight_kg, tare_weight_kg, batch_number, supplier, purchase_date, expiry_date, location, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [refrigerant_type, refrigerant_gwp, cylinder_size_kg, current_weight_kg, tare_weight_kg, batch_number, supplier, purchase_date, expiry_date, location, status || 'vol', notes]
    );
    logger.audit('CYLINDER_CREATED', { 
      cylinderId: result.insertId, 
      refrigerantType: refrigerant_type,
      cylinderSize: cylinder_size_kg,
      batchNumber: batch_number
    }, req);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Error creating cylinder:', err);
    res.status(500).json({ error: 'Kon cilinder niet aanmaken' });
  }
});

// Update cylinder
router.put('/cylinders/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { refrigerant_type, refrigerant_gwp, cylinder_size_kg, current_weight_kg, tare_weight_kg, batch_number, supplier, purchase_date, expiry_date, location, status, notes, is_active } = req.body;
  
  try {
    await pool.query(
      `UPDATE refrigerant_cylinders SET refrigerant_type = ?, refrigerant_gwp = ?, cylinder_size_kg = ?, current_weight_kg = ?, tare_weight_kg = ?, batch_number = ?, supplier = ?, purchase_date = ?, expiry_date = ?, location = ?, status = ?, notes = ?, is_active = ?
       WHERE id = ?`,
      [refrigerant_type, refrigerant_gwp, cylinder_size_kg, current_weight_kg, tare_weight_kg, batch_number, supplier, purchase_date, expiry_date, location, status, notes, is_active, id]
    );
    logger.audit('CYLINDER_UPDATED', { cylinderId: id, status }, req);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating cylinder:', err);
    res.status(500).json({ error: 'Kon cilinder niet bijwerken' });
  }
});

// Delete cylinder
router.delete('/cylinders/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE refrigerant_cylinders SET is_active = 0 WHERE id = ?', [req.params.id]);
    logger.audit('CYLINDER_DELETED', { cylinderId: req.params.id }, req);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting cylinder:', err);
    res.status(500).json({ error: 'Kon cilinder niet verwijderen' });
  }
});

// =============================================
// INSTALLATIONS
// =============================================

// Get all installations with customer info
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, c.contact_name as customer_name, c.address_city as customer_city,
             t.name as technician_name
      FROM installations i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN technicians t ON i.installed_by_technician_id = t.id
      ORDER BY i.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching installations:', err);
    res.status(500).json({ error: 'Kon installaties niet ophalen' });
  }
});

// Get single installation by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, c.*, t.name as technician_name, t.fgas_certificate_number
      FROM installations i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN technicians t ON i.installed_by_technician_id = t.id
      WHERE i.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Installatie niet gevonden' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching installation:', err);
    res.status(500).json({ error: 'Kon installatie niet ophalen' });
  }
});

// Get installation by QR code (PUBLIC - for QR scanning)
router.get('/qr/:qrCode', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id, i.name, i.location_description, i.installation_type, i.brand, i.model,
             i.installation_date, i.warranty_expires, i.next_maintenance_date, i.status,
             c.contact_name as customer_name, c.address_city as customer_city
      FROM installations i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.qr_code = ?
    `, [req.params.qrCode]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Installatie niet gevonden' });
    }
    
    // Get recent maintenance
    const [maintenance] = await pool.query(`
      SELECT maintenance_type, description, performed_at 
      FROM maintenance_records 
      WHERE installation_id = ? 
      ORDER BY performed_at DESC 
      LIMIT 5
    `, [rows[0].id]);
    
    res.json({ ...rows[0], recent_maintenance: maintenance });
  } catch (err) {
    console.error('Error fetching installation by QR:', err);
    res.status(500).json({ error: 'Kon installatie niet ophalen' });
  }
});

// Create installation
router.post('/', authMiddleware, async (req, res) => {
  const { 
    customer_id, name, location_description, installation_type,
    brand, model, serial_number, refrigerant_type, refrigerant_gwp,
    refrigerant_charge_kg, installation_date, warranty_expires,
    next_maintenance_date, installed_by_technician_id, notes
  } = req.body;
  
  const qr_code = uuidv4();
  
  try {
    const [result] = await pool.query(
      `INSERT INTO installations (
        qr_code, customer_id, name, location_description, installation_type,
        brand, model, serial_number, refrigerant_type, refrigerant_gwp,
        refrigerant_charge_kg, installation_date, warranty_expires,
        next_maintenance_date, installed_by_technician_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [qr_code, customer_id, name, location_description, installation_type,
       brand, model, serial_number, refrigerant_type, refrigerant_gwp,
       refrigerant_charge_kg, installation_date, warranty_expires,
       next_maintenance_date, installed_by_technician_id, notes]
    );
    
    // Create initial F-gas log entry for installation
    await pool.query(
      `INSERT INTO fgas_logs (
        installation_id, technician_id, activity_type, refrigerant_type,
        refrigerant_gwp, quantity_kg, is_addition, new_total_charge_kg, performed_at
      ) VALUES (?, ?, 'installatie', ?, ?, ?, true, ?, ?)`,
      [result.insertId, installed_by_technician_id, refrigerant_type, 
       refrigerant_gwp, refrigerant_charge_kg, refrigerant_charge_kg, installation_date]
    );
    
    // BRL 100 Audit log
    logger.installation('CREATED', {
      installation_id: result.insertId,
      qr_code,
      customer_id,
      name,
      brand,
      model,
      refrigerant_type,
      refrigerant_charge_kg,
      co2_equivalent: (refrigerant_charge_kg * refrigerant_gwp / 1000).toFixed(2),
      technician_id: installed_by_technician_id,
      installation_date,
      user_id: req.user?.id
    });
    
    res.status(201).json({ id: result.insertId, qr_code });
  } catch (err) {
    logger.error('INSTALLATIONS', 'Error creating installation', { error: err.message });
    res.status(500).json({ error: 'Kon installatie niet aanmaken' });
  }
});

// Update installation
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { 
    name, location_description, brand, model, serial_number,
    next_maintenance_date, next_leak_check_date, status, notes
  } = req.body;
  
  try {
    await pool.query(
      `UPDATE installations SET 
        name = ?, location_description = ?, brand = ?, model = ?, serial_number = ?,
        next_maintenance_date = ?, next_leak_check_date = ?, status = ?, notes = ?
       WHERE id = ?`,
      [name, location_description, brand, model, serial_number,
       next_maintenance_date, next_leak_check_date, status, notes, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating installation:', err);
    res.status(500).json({ error: 'Kon installatie niet bijwerken' });
  }
});

// Delete installation
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM installations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting installation:', err);
    res.status(500).json({ error: 'Kon installatie niet verwijderen' });
  }
});

// =============================================
// F-GAS LOGS
// =============================================

// Get F-gas logs for installation
router.get('/:id/fgas', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*, t.name as technician_name, t.fgas_certificate_number
      FROM fgas_logs f
      LEFT JOIN technicians t ON f.technician_id = t.id
      WHERE f.installation_id = ?
      ORDER BY f.performed_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching F-gas logs:', err);
    res.status(500).json({ error: 'Kon F-gas logs niet ophalen' });
  }
});

// Create F-gas log entry
router.post('/:id/fgas', authMiddleware, async (req, res) => {
  const { installation_id } = { installation_id: req.params.id };
  const {
    technician_id, activity_type, refrigerant_type, refrigerant_gwp,
    quantity_kg, is_addition, new_total_charge_kg, leak_detected,
    leak_location, leak_repaired, result, notes, performed_at
  } = req.body;
  
  try {
    const [insertResult] = await pool.query(
      `INSERT INTO fgas_logs (
        installation_id, technician_id, activity_type, refrigerant_type,
        refrigerant_gwp, quantity_kg, is_addition, new_total_charge_kg,
        leak_detected, leak_location, leak_repaired, result, notes, performed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [installation_id, technician_id, activity_type, refrigerant_type,
       refrigerant_gwp, quantity_kg, is_addition, new_total_charge_kg,
       leak_detected, leak_location, leak_repaired, result, notes, performed_at]
    );
    
    // Update installation refrigerant charge if applicable
    if (new_total_charge_kg) {
      await pool.query(
        'UPDATE installations SET refrigerant_charge_kg = ? WHERE id = ?',
        [new_total_charge_kg, installation_id]
      );
    }
    
    // Update next leak check date if it was a leak check
    if (activity_type === 'lekcontrole') {
      // Calculate next check based on CO2 equivalent (simplified: 12 months for now)
      const nextCheck = new Date(performed_at);
      nextCheck.setFullYear(nextCheck.getFullYear() + 1);
      await pool.query(
        'UPDATE installations SET next_leak_check_date = ? WHERE id = ?',
        [nextCheck.toISOString().split('T')[0], installation_id]
      );
    }
    
    // F-Gas Audit log (EU 517/2014 compliance)
    logger.fgas(activity_type, {
      log_id: insertResult.insertId,
      installation_id,
      technician_id,
      refrigerant_type,
      refrigerant_gwp,
      quantity_kg,
      is_addition,
      new_total_charge_kg,
      co2_equivalent: (quantity_kg * refrigerant_gwp / 1000).toFixed(2),
      leak_detected,
      leak_location,
      leak_repaired,
      result,
      performed_at,
      user_id: req.user?.id
    });
    
    res.status(201).json({ id: insertResult.insertId });
  } catch (err) {
    logger.error('FGAS', 'Error creating F-gas log', { error: err.message, installation_id });
    res.status(500).json({ error: 'Kon F-gas log niet aanmaken' });
  }
});

// =============================================
// MAINTENANCE RECORDS
// =============================================

// Get maintenance records for installation
router.get('/:id/maintenance', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, t.name as technician_name
      FROM maintenance_records m
      LEFT JOIN technicians t ON m.technician_id = t.id
      WHERE m.installation_id = ?
      ORDER BY m.performed_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching maintenance records:', err);
    res.status(500).json({ error: 'Kon onderhoudshistorie niet ophalen' });
  }
});

// Create maintenance record
router.post('/:id/maintenance', authMiddleware, async (req, res) => {
  const { installation_id } = { installation_id: req.params.id };
  const {
    technician_id, maintenance_type, description, parts_replaced,
    labor_hours, parts_cost, total_cost, performed_at, next_maintenance_date
  } = req.body;
  
  try {
    const [result] = await pool.query(
      `INSERT INTO maintenance_records (
        installation_id, technician_id, maintenance_type, description,
        parts_replaced, labor_hours, parts_cost, total_cost, performed_at, next_maintenance_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [installation_id, technician_id, maintenance_type, description,
       JSON.stringify(parts_replaced || []), labor_hours, parts_cost, total_cost, performed_at, next_maintenance_date]
    );
    
    // Update installation next maintenance date
    if (next_maintenance_date) {
      await pool.query(
        'UPDATE installations SET next_maintenance_date = ? WHERE id = ?',
        [next_maintenance_date, installation_id]
      );
    }
    
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Error creating maintenance record:', err);
    res.status(500).json({ error: 'Kon onderhoudsrecord niet aanmaken' });
  }
});

// =============================================
// FAULT REPORTS (PUBLIC for QR scanning)
// =============================================

// Create fault report (PUBLIC)
router.post('/qr/:qrCode/fault', async (req, res) => {
  const { qrCode } = req.params;
  const { reporter_name, reporter_phone, reporter_email, fault_type, error_code, description, urgency } = req.body;
  
  try {
    // Find installation by QR code with details
    const [installations] = await pool.query(
      `SELECT i.id, i.name, i.brand, i.model, i.location_description 
       FROM installations i WHERE i.qr_code = ?`,
      [qrCode]
    );
    
    if (installations.length === 0) {
      return res.status(404).json({ error: 'Installatie niet gevonden' });
    }
    
    const installation = installations[0];
    
    const [result] = await pool.query(
      `INSERT INTO fault_reports (
        installation_id, reporter_name, reporter_phone, reporter_email,
        fault_type, error_code, description, urgency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [installation.id, reporter_name, reporter_phone, reporter_email,
       fault_type, error_code, description, urgency]
    );
    
    // Send email notification (async, don't wait for result)
    const faultData = {
      reporter_name, reporter_phone, reporter_email,
      fault_type, error_code, description, urgency
    };
    sendFaultNotification(faultData, installation).catch(err => {
      console.error('Failed to send fault notification email:', err.message);
    });
    
    res.status(201).json({ id: result.insertId, message: 'Storingsmelding ontvangen' });
  } catch (err) {
    console.error('Error creating fault report:', err);
    res.status(500).json({ error: 'Kon storingsmelding niet versturen' });
  }
});

// Get all fault reports (admin)
router.get('/faults/all', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*, i.name as installation_name, i.brand, i.model,
             c.contact_name as customer_name, c.phone as customer_phone,
             t.name as assigned_technician_name
      FROM fault_reports f
      LEFT JOIN installations i ON f.installation_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN technicians t ON f.assigned_technician_id = t.id
      ORDER BY 
        CASE f.urgency WHEN 'spoed' THEN 1 WHEN 'hoog' THEN 2 WHEN 'normaal' THEN 3 ELSE 4 END,
        f.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching fault reports:', err);
    res.status(500).json({ error: 'Kon storingen niet ophalen' });
  }
});

// Update fault report status
router.patch('/faults/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status, assigned_technician_id, resolution_notes } = req.body;
  
  try {
    const resolved_at = status === 'opgelost' ? new Date() : null;
    
    await pool.query(
      `UPDATE fault_reports SET status = ?, assigned_technician_id = ?, 
       resolution_notes = ?, resolved_at = ? WHERE id = ?`,
      [status, assigned_technician_id, resolution_notes, resolved_at, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating fault report:', err);
    res.status(500).json({ error: 'Kon storing niet bijwerken' });
  }
});

// =============================================
// STATISTICS
// =============================================

router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const [totalInstallations] = await pool.query('SELECT COUNT(*) as count FROM installations WHERE status != "verwijderd"');
    const [maintenanceDue] = await pool.query('SELECT COUNT(*) as count FROM installations WHERE next_maintenance_date <= CURDATE() AND status = "actief"');
    const [leakCheckDue] = await pool.query('SELECT COUNT(*) as count FROM installations WHERE next_leak_check_date <= CURDATE() AND status = "actief"');
    const [openFaults] = await pool.query('SELECT COUNT(*) as count FROM fault_reports WHERE status NOT IN ("opgelost", "gesloten")');
    const [totalCO2] = await pool.query('SELECT SUM(co2_equivalent) as total FROM installations WHERE status = "actief"');
    
    res.json({
      totalInstallations: totalInstallations[0].count,
      maintenanceDue: maintenanceDue[0].count,
      leakCheckDue: leakCheckDue[0].count,
      openFaults: openFaults[0].count,
      totalCO2Equivalent: totalCO2[0].total || 0
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Kon statistieken niet ophalen' });
  }
});

// =============================================
// EQUIPMENT CALIBRATION CHECK & NOTIFICATIONS
// =============================================

// Check expiring equipment and send notification (can be called by cron or manually)
router.post('/equipment/check-calibration', authMiddleware, async (req, res) => {
  try {
    const daysAhead = req.body.daysAhead || 30; // Default: check 30 days ahead
    
    // Get equipment expiring within the specified days
    const [expiringEquipment] = await pool.query(`
      SELECT * FROM equipment 
      WHERE is_active = 1 
        AND calibration_valid_until IS NOT NULL
        AND calibration_valid_until <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY calibration_valid_until ASC
    `, [daysAhead]);
    
    if (expiringEquipment.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Geen gereedschap verloopt binnenkort',
        count: 0 
      });
    }
    
    // Send notification
    const result = await sendEquipmentExpiringNotification(expiringEquipment);
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Notificatie verzonden voor ${expiringEquipment.length} item(s)` 
        : 'Kon notificatie niet verzenden',
      count: expiringEquipment.length,
      items: expiringEquipment.map(eq => ({
        id: eq.id,
        name: eq.name,
        type: eq.equipment_type,
        validUntil: eq.calibration_valid_until
      }))
    });
  } catch (err) {
    console.error('Error checking equipment calibration:', err);
    res.status(500).json({ error: 'Kon kalibratie check niet uitvoeren' });
  }
});

// Get expiring equipment list without sending notification
router.get('/equipment/expiring', authMiddleware, async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30;
    
    const [expiringEquipment] = await pool.query(`
      SELECT * FROM equipment 
      WHERE is_active = 1 
        AND calibration_valid_until IS NOT NULL
        AND calibration_valid_until <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY calibration_valid_until ASC
    `, [daysAhead]);
    
    res.json(expiringEquipment);
  } catch (err) {
    console.error('Error fetching expiring equipment:', err);
    res.status(500).json({ error: 'Kon verlopend gereedschap niet ophalen' });
  }
});

module.exports = router;
