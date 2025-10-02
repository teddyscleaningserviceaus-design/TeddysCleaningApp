const db = require('../database');

module.exports = (app) => {
  // Get all space projects
  app.get('/api/space-projects', async (req, res) => {
    try {
      const projects = await db.query('SELECT * FROM space_projects ORDER BY created_date DESC');
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create space project
  app.post('/api/space-projects', async (req, res) => {
    try {
      const { name, description, design_data } = req.body;
      const result = await db.run(
        'INSERT INTO space_projects (name, description, design_data) VALUES (?, ?, ?)',
        [name, description, JSON.stringify(design_data)]
      );
      res.json({ id: result.id, message: 'Project created successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Run simulation
  app.post('/api/space-projects/:id/simulate', async (req, res) => {
    try {
      const { parameters } = req.body;
      
      // Simulate orbital mechanics calculation
      const simulation = {
        trajectory: generateTrajectory(parameters),
        fuel_consumption: calculateFuelConsumption(parameters),
        mission_duration: parameters.mission_duration || 180,
        success_probability: 0.85
      };

      await db.run(
        'UPDATE space_projects SET simulation_results = ? WHERE id = ?',
        [JSON.stringify(simulation), req.params.id]
      );

      res.json(simulation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

function generateTrajectory(params) {
  const points = [];
  for (let i = 0; i < 100; i++) {
    points.push({
      time: i * (params.mission_duration || 180) / 100,
      altitude: (params.altitude || 400) + Math.sin(i * 0.1) * 50,
      velocity: (params.velocity || 7800) + Math.cos(i * 0.1) * 100
    });
  }
  return points;
}

function calculateFuelConsumption(params) {
  const baseFuel = 1000; // kg
  const missionFactor = (params.mission_duration || 180) / 180;
  return baseFuel * missionFactor;
}