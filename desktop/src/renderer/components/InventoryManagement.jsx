import React, { useState, useEffect } from 'react';

function InventoryManagement() {
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipment, setEquipment] = useState([]);
  const [chemicals, setChemicals] = useState([]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const [equipmentRes, chemicalsRes] = await Promise.all([
        fetch('http://localhost:3001/api/equipment'),
        fetch('http://localhost:3001/api/chemicals')
      ]);
      setEquipment(await equipmentRes.json());
      setChemicals(await chemicalsRes.json());
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const updateChemicalQuantity = async (id, newQuantity) => {
    try {
      await fetch(`http://localhost:3001/api/chemicals/${id}/quantity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });
      fetchInventory();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  return (
    <div className="inventory-management">
      <h1>Inventory Management</h1>
      
      <div className="tabs">
        <button 
          className={activeTab === 'equipment' ? 'active' : ''}
          onClick={() => setActiveTab('equipment')}
        >
          🔧 Equipment
        </button>
        <button 
          className={activeTab === 'chemicals' ? 'active' : ''}
          onClick={() => setActiveTab('chemicals')}
        >
          🧪 Chemicals
        </button>
      </div>

      {activeTab === 'equipment' && (
        <div className="equipment-section">
          <div className="section-header">
            <h2>Equipment Catalog</h2>
            <button className="add-btn">+ Add Equipment</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Purchase Date</th>
                <th>Status</th>
                <th>Maintenance Due</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.type}</td>
                  <td>{item.purchase_date}</td>
                  <td>
                    <span className={`status ${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.maintenance_due || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'chemicals' && (
        <div className="chemicals-section">
          <div className="section-header">
            <h2>Chemical Inventory</h2>
            <button className="add-btn">+ Add Chemical</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Reorder Point</th>
                <th>Supplier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chemicals.map(chemical => (
                <tr key={chemical.id} className={chemical.quantity <= chemical.reorder_point ? 'low-stock' : ''}>
                  <td>{chemical.name}</td>
                  <td>
                    <input
                      type="number"
                      value={chemical.quantity}
                      onChange={(e) => updateChemicalQuantity(chemical.id, parseInt(e.target.value))}
                      className="quantity-input"
                    />
                  </td>
                  <td>{chemical.unit}</td>
                  <td>{chemical.reorder_point}</td>
                  <td>{chemical.supplier}</td>
                  <td>
                    {chemical.quantity <= chemical.reorder_point && (
                      <span className="alert">⚠️ Low Stock</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InventoryManagement;