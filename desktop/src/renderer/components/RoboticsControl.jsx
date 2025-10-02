import React, { useState, useEffect } from 'react';

function RoboticsControl() {
  const [robots, setRobots] = useState([]);
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);

  useEffect(() => {
    fetchRobots();
  }, []);

  const fetchRobots = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/robots');
      const data = await response.json();
      setRobots(data);
    } catch (error) {
      console.error('Error fetching robots:', error);
    }
  };

  const sendCommand = async (command, parameters = {}) => {
    if (!selectedRobot) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/robots/${selectedRobot.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, parameters })
      });
      const result = await response.json();
      setCommandHistory(prev => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Error sending command:', error);
    }
  };

  return (
    <div className="robotics-control">
      <h1>🤖 Robotics Control Center</h1>
      
      <div className="robotics-layout">
        <div className="robot-fleet">
          <h3>Robot Fleet</h3>
          {robots.map(robot => (
            <div 
              key={robot.id}
              className={`robot-card ${selectedRobot?.id === robot.id ? 'selected' : ''}`}
              onClick={() => setSelectedRobot(robot)}
            >
              <h4>{robot.name}</h4>
              <p>Model: {robot.model}</p>
              <div className="battery-indicator">
                <span>🔋 {robot.battery_level}%</span>
                <div className="battery-bar">
                  <div 
                    className="battery-fill" 
                    style={{ width: `${robot.battery_level}%` }}
                  ></div>
                </div>
              </div>
              <span className={`status ${robot.status}`}>{robot.status}</span>
            </div>
          ))}
        </div>

        <div className="control-panel">
          {selectedRobot ? (
            <div>
              <h3>Control: {selectedRobot.name}</h3>
              <div className="control-grid">
                <button onClick={() => sendCommand('start_cleaning')}>
                  🧹 Start Cleaning
                </button>
                <button onClick={() => sendCommand('return_home')}>
                  🏠 Return Home
                </button>
                <button onClick={() => sendCommand('pause')}>
                  ⏸️ Pause
                </button>
                <button onClick={() => sendCommand('emergency_stop')}>
                  🛑 Emergency Stop
                </button>
              </div>
              
              <div className="telemetry">
                <h4>Live Telemetry</h4>
                <div className="telemetry-grid">
                  <div className="telemetry-item">
                    <span>Battery:</span>
                    <span>{selectedRobot.battery_level}%</span>
                  </div>
                  <div className="telemetry-item">
                    <span>Status:</span>
                    <span>{selectedRobot.status}</span>
                  </div>
                  <div className="telemetry-item">
                    <span>Location:</span>
                    <span>{selectedRobot.location || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <p>Select a robot to control</p>
            </div>
          )}
        </div>

        <div className="command-history">
          <h3>Command History</h3>
          <div className="history-list">
            {commandHistory.map((cmd, index) => (
              <div key={index} className="history-item">
                <span className="timestamp">{new Date(cmd.timestamp).toLocaleTimeString()}</span>
                <span className="command">{cmd.command}</span>
                <span className={`status ${cmd.status}`}>{cmd.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoboticsControl;