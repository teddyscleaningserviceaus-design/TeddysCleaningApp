import React, { useState } from 'react';

function SpaceVenture() {
  const [activeTab, setActiveTab] = useState('design');
  const [projects, setProjects] = useState([
    { id: 1, name: 'Helium Propulsion System', status: 'In Development' },
    { id: 2, name: 'Orbital Cleaning Platform', status: 'Concept' }
  ]);

  const components = [
    { name: 'Helium Tank', type: 'Propulsion', mass: '50kg' },
    { name: 'Ion Thruster', type: 'Propulsion', mass: '15kg' },
    { name: 'Solar Panel Array', type: 'Power', mass: '25kg' },
    { name: 'Navigation Computer', type: 'Control', mass: '5kg' }
  ];

  return (
    <div className="space-venture">
      <h1>🚀 Space Venture Platform</h1>
      
      <div className="tabs">
        <button 
          className={activeTab === 'design' ? 'active' : ''}
          onClick={() => setActiveTab('design')}
        >
          🛠️ Design Studio
        </button>
        <button 
          className={activeTab === 'simulation' ? 'active' : ''}
          onClick={() => setActiveTab('simulation')}
        >
          🔬 Simulation
        </button>
        <button 
          className={activeTab === 'missions' ? 'active' : ''}
          onClick={() => setActiveTab('missions')}
        >
          🌌 Mission Planning
        </button>
      </div>

      {activeTab === 'design' && (
        <div className="design-studio">
          <div className="design-layout">
            <div className="component-library">
              <h3>Component Library</h3>
              {components.map((comp, index) => (
                <div key={index} className="component-item">
                  <h4>{comp.name}</h4>
                  <p>Type: {comp.type}</p>
                  <p>Mass: {comp.mass}</p>
                  <button className="add-component">Add to Design</button>
                </div>
              ))}
            </div>
            
            <div className="design-canvas">
              <h3>3D Design Canvas</h3>
              <div className="canvas-placeholder">
                <p>🛸 Spacecraft Design Area</p>
                <p>Drag components here to build your spacecraft</p>
                <div className="design-tools">
                  <button>🔄 Rotate</button>
                  <button>📏 Measure</button>
                  <button>💾 Save Design</button>
                </div>
              </div>
            </div>

            <div className="design-properties">
              <h3>Design Properties</h3>
              <div className="property-list">
                <div className="property">
                  <span>Total Mass:</span>
                  <span>95kg</span>
                </div>
                <div className="property">
                  <span>Power Consumption:</span>
                  <span>2.5kW</span>
                </div>
                <div className="property">
                  <span>Thrust Capacity:</span>
                  <span>150N</span>
                </div>
                <div className="property">
                  <span>Mission Duration:</span>
                  <span>6 months</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulation' && (
        <div className="simulation-lab">
          <h3>Physics Simulation Lab</h3>
          <div className="simulation-controls">
            <button className="sim-btn">▶️ Run Simulation</button>
            <button className="sim-btn">⏸️ Pause</button>
            <button className="sim-btn">🔄 Reset</button>
          </div>
          
          <div className="simulation-results">
            <div className="result-chart">
              <h4>Orbital Trajectory</h4>
              <div className="chart-placeholder">
                📈 Trajectory visualization will appear here
              </div>
            </div>
            
            <div className="simulation-data">
              <h4>Simulation Parameters</h4>
              <div className="param-grid">
                <label>Initial Velocity: <input type="number" defaultValue="7800" /> m/s</label>
                <label>Altitude: <input type="number" defaultValue="400" /> km</label>
                <label>Inclination: <input type="number" defaultValue="51.6" /> degrees</label>
                <label>Mission Duration: <input type="number" defaultValue="180" /> days</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'missions' && (
        <div className="mission-planning">
          <h3>Mission Control Center</h3>
          <div className="mission-grid">
            {projects.map(project => (
              <div key={project.id} className="mission-card">
                <h4>{project.name}</h4>
                <p>Status: {project.status}</p>
                <div className="mission-actions">
                  <button>📋 View Details</button>
                  <button>🚀 Launch Simulation</button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mission-timeline">
            <h4>Mission Timeline</h4>
            <div className="timeline">
              <div className="timeline-item">
                <span className="phase">Phase 1: Design</span>
                <span className="duration">3 months</span>
              </div>
              <div className="timeline-item">
                <span className="phase">Phase 2: Testing</span>
                <span className="duration">2 months</span>
              </div>
              <div className="timeline-item">
                <span className="phase">Phase 3: Launch</span>
                <span className="duration">1 month</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceVenture;