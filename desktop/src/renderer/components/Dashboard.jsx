import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [stats, setStats] = useState({
    employees: 0,
    equipment: 0,
    chemicals: 0,
    sites: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [employees, equipment, chemicals, sites] = await Promise.all([
        fetch('http://localhost:3001/api/employees').then(r => r.json()),
        fetch('http://localhost:3001/api/equipment').then(r => r.json()),
        fetch('http://localhost:3001/api/chemicals').then(r => r.json()),
        fetch('http://localhost:3001/api/sites').then(r => r.json())
      ]);
      
      setStats({
        employees: employees.length,
        equipment: equipment.length,
        chemicals: chemicals.length,
        sites: sites.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Business Overview</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>👥 Employees</h3>
          <p className="stat-number">{stats.employees}</p>
        </div>
        <div className="stat-card">
          <h3>🔧 Equipment</h3>
          <p className="stat-number">{stats.equipment}</p>
        </div>
        <div className="stat-card">
          <h3>🧪 Chemicals</h3>
          <p className="stat-number">{stats.chemicals}</p>
        </div>
        <div className="stat-card">
          <h3>🏢 Sites</h3>
          <p className="stat-number">{stats.sites}</p>
        </div>
      </div>
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn">Add Employee</button>
          <button className="action-btn">New Site</button>
          <button className="action-btn">Stock Check</button>
          <button className="action-btn">Schedule Cleaning</button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;