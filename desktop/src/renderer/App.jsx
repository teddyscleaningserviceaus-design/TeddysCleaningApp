import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import EmployeeManagement from './components/EmployeeManagement';
import InventoryManagement from './components/InventoryManagement';
import SiteManagement from './components/SiteManagement';
import RoboticsControl from './components/RoboticsControl';
import SpaceVenture from './components/SpaceVenture';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import CodingFramework from './components/CodingFramework';
import './App.css';

function App() {
  const [activeModule, setActiveModule] = useState('dashboard');

  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'employees', name: 'Employees', icon: '👥' },
    { id: 'inventory', name: 'Inventory', icon: '📦' },
    { id: 'sites', name: 'Sites', icon: '🏢' },
    { id: 'robotics', name: 'Robotics', icon: '🤖' },
    { id: 'space', name: 'Space Venture', icon: '🚀' },
    { id: 'analytics', name: 'Analytics', icon: '📊' },
    { id: 'coding', name: 'Code Editor', icon: '💻' }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <Dashboard />;
      case 'employees': return <EmployeeManagement />;
      case 'inventory': return <InventoryManagement />;
      case 'sites': return <SiteManagement />;
      case 'robotics': return <RoboticsControl />;
      case 'space': return <SpaceVenture />;
      case 'analytics': return <AdvancedAnalytics />;
      case 'coding': return <CodingFramework />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <h2>Teddy's Cleaning</h2>
          <p>Business Platform</p>
        </div>
        <ul className="nav-menu">
          {modules.map(module => (
            <li key={module.id}>
              <button
                className={`nav-item ${activeModule === module.id ? 'active' : ''}`}
                onClick={() => setActiveModule(module.id)}
              >
                <span className="icon">{module.icon}</span>
                {module.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="main-content">
        {renderModule()}
      </main>
    </div>
  );
}

export default App;