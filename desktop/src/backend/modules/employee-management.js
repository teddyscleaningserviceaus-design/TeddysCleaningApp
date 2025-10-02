const db = require('../database');

module.exports = (app) => {
  // Get all employees
  app.get('/api/employees', async (req, res) => {
    try {
      const employees = await db.query('SELECT * FROM employees ORDER BY name');
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create employee
  app.post('/api/employees', async (req, res) => {
    try {
      const { name, email, phone, role } = req.body;
      const result = await db.run(
        'INSERT INTO employees (name, email, phone, role, hire_date) VALUES (?, ?, ?, ?, ?)',
        [name, email, phone, role, new Date().toISOString().split('T')[0]]
      );
      res.json({ id: result.id, message: 'Employee created successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update employee
  app.put('/api/employees/:id', async (req, res) => {
    try {
      const { name, email, phone, role, status } = req.body;
      await db.run(
        'UPDATE employees SET name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?',
        [name, email, phone, role, status, req.params.id]
      );
      res.json({ message: 'Employee updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete employee
  app.delete('/api/employees/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM employees WHERE id = ?', [req.params.id]);
      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};