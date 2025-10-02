const db = require('../database');

module.exports = (app) => {
  // Get all cleaning sites
  app.get('/api/sites', async (req, res) => {
    try {
      const sites = await db.query('SELECT * FROM cleaning_sites ORDER BY client_name');
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create cleaning site
  app.post('/api/sites', async (req, res) => {
    try {
      const { client_name, address, contract_details, frequency } = req.body;
      const result = await db.run(
        'INSERT INTO cleaning_sites (client_name, address, contract_details, frequency) VALUES (?, ?, ?, ?)',
        [client_name, address, contract_details, frequency]
      );
      res.json({ id: result.id, message: 'Site created successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update site
  app.put('/api/sites/:id', async (req, res) => {
    try {
      const { client_name, address, contract_details, frequency } = req.body;
      await db.run(
        'UPDATE cleaning_sites SET client_name = ?, address = ?, contract_details = ?, frequency = ? WHERE id = ?',
        [client_name, address, contract_details, frequency, req.params.id]
      );
      res.json({ message: 'Site updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload floor plan
  app.post('/api/sites/:id/floorplan', async (req, res) => {
    try {
      const { floor_plan_path } = req.body;
      await db.run(
        'UPDATE cleaning_sites SET floor_plan_path = ? WHERE id = ?',
        [floor_plan_path, req.params.id]
      );
      res.json({ message: 'Floor plan uploaded successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};