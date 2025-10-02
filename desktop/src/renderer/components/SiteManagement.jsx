import React, { useState, useEffect } from 'react';

function SiteManagement() {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sites');
      const data = await response.json();
      setSites(data);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  return (
    <div className="site-management">
      <div className="header">
        <h1>Cleaning Sites</h1>
        <button onClick={() => setShowForm(true)} className="add-btn">
          + Add Site
        </button>
      </div>

      <div className="sites-layout">
        <div className="sites-list">
          <h3>Sites Overview</h3>
          {sites.map(site => (
            <div 
              key={site.id} 
              className={`site-card ${selectedSite?.id === site.id ? 'selected' : ''}`}
              onClick={() => setSelectedSite(site)}
            >
              <h4>{site.client_name}</h4>
              <p>📍 {site.address}</p>
              <p>🔄 {site.frequency}</p>
              <div className="site-actions">
                <button className="btn-small">📋 Tasks</button>
                <button className="btn-small">📊 Reports</button>
              </div>
            </div>
          ))}
        </div>

        <div className="site-details">
          {selectedSite ? (
            <div>
              <h3>{selectedSite.client_name}</h3>
              <div className="detail-section">
                <h4>Site Information</h4>
                <p><strong>Address:</strong> {selectedSite.address}</p>
                <p><strong>Frequency:</strong> {selectedSite.frequency}</p>
                <p><strong>Contract:</strong> {selectedSite.contract_details}</p>
              </div>
              
              <div className="detail-section">
                <h4>Floor Plan</h4>
                {selectedSite.floor_plan_path ? (
                  <div className="floor-plan">
                    <p>Floor plan available</p>
                    <button className="btn">View Floor Plan</button>
                  </div>
                ) : (
                  <div className="no-floor-plan">
                    <p>No floor plan uploaded</p>
                    <button className="btn">Upload Floor Plan</button>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h4>Resource Allocation</h4>
                <div className="resource-grid">
                  <div className="resource-item">
                    <span>👥 Assigned Staff</span>
                    <button className="btn-small">Manage</button>
                  </div>
                  <div className="resource-item">
                    <span>🔧 Equipment</span>
                    <button className="btn-small">Allocate</button>
                  </div>
                  <div className="resource-item">
                    <span>🧪 Chemicals</span>
                    <button className="btn-small">Assign</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <p>Select a site to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SiteManagement;