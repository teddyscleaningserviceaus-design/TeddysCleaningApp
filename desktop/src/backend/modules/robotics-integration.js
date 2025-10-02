const db = require('../database');

module.exports = (app) => {
  // Get all robots
  app.get('/api/robots', async (req, res) => {
    try {
      const robots = await db.query('SELECT * FROM robots ORDER BY name');
      res.json(robots);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add robot
  app.post('/api/robots', async (req, res) => {
    try {
      const { name, model, capabilities, battery_level } = req.body;
      const result = await db.run(
        'INSERT INTO robots (name, model, capabilities, battery_level, status) VALUES (?, ?, ?, ?, ?)',
        [name, model, JSON.stringify(capabilities), battery_level, 'idle']
      );
      res.json({ id: result.id, message: 'Robot added successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Robot telemetry
  app.post('/api/robots/:id/telemetry', async (req, res) => {
    try {
      const { location, battery_level, status, sensor_data } = req.body;
      await db.run(
        'UPDATE robots SET location = ?, battery_level = ?, status = ?, last_update = ? WHERE id = ?',
        [JSON.stringify(location), battery_level, status, new Date().toISOString(), req.params.id]
      );
      res.json({ message: 'Telemetry updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Robot commands
  app.post('/api/robots/:id/command', async (req, res) => {
    try {
      const { command, parameters } = req.body;
      // Simulate robot command execution
      const commandResult = {
        robot_id: req.params.id,
        command,
        parameters,
        timestamp: new Date().toISOString(),
        status: 'executed'
      };
      res.json(commandResult);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};