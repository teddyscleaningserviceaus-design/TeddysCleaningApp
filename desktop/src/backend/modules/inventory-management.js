const db = require('../database');

module.exports = (app) => {
  // Equipment endpoints
  app.get('/api/equipment', async (req, res) => {
    try {
      const equipment = await db.query('SELECT * FROM equipment ORDER BY name');
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/equipment', async (req, res) => {
    try {
      const { name, type, purchase_date } = req.body;
      const result = await db.run(
        'INSERT INTO equipment (name, type, purchase_date) VALUES (?, ?, ?)',
        [name, type, purchase_date]
      );
      res.json({ id: result.id, message: 'Equipment added successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Chemicals endpoints
  app.get('/api/chemicals', async (req, res) => {
    try {
      const chemicals = await db.query('SELECT * FROM chemicals ORDER BY name');
      res.json(chemicals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/chemicals', async (req, res) => {
    try {
      const { name, quantity, unit, reorder_point, supplier } = req.body;
      const result = await db.run(
        'INSERT INTO chemicals (name, quantity, unit, reorder_point, supplier) VALUES (?, ?, ?, ?, ?)',
        [name, quantity, unit, reorder_point, supplier]
      );
      res.json({ id: result.id, message: 'Chemical added successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/chemicals/:id/quantity', async (req, res) => {
    try {
      const { quantity } = req.body;
      await db.run('UPDATE chemicals SET quantity = ? WHERE id = ?', [quantity, req.params.id]);
      res.json({ message: 'Quantity updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};