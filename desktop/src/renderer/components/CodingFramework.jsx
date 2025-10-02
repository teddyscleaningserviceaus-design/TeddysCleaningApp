import React, { useState } from 'react';

function CodingFramework() {
  const [activeTab, setActiveTab] = useState('editor');
  const [code, setCode] = useState(`# Welcome to the Educational Coding Framework
# This is where you can customize and extend the application

def calculate_cleaning_efficiency(area_sqm, time_minutes, staff_count):
    """
    Calculate cleaning efficiency metrics
    """
    efficiency = area_sqm / (time_minutes * staff_count)
    return {
        'efficiency_score': efficiency,
        'area_per_person_hour': (area_sqm / staff_count) * 60 / time_minutes,
        'recommended_staff': max(1, int(area_sqm / 100))  # 1 person per 100 sqm
    }

# Example usage:
result = calculate_cleaning_efficiency(500, 120, 2)
print(f"Efficiency Score: {result['efficiency_score']:.2f}")
print(f"Area per person-hour: {result['area_per_person_hour']:.2f} sqm")
print(f"Recommended staff: {result['recommended_staff']} people")
`);

  const tutorials = [
    { id: 1, title: 'Basic Python for Business Logic', difficulty: 'Beginner' },
    { id: 2, title: 'Data Visualization with Charts', difficulty: 'Intermediate' },
    { id: 3, title: 'Custom Inventory Algorithms', difficulty: 'Intermediate' },
    { id: 4, title: 'AI Integration for Scheduling', difficulty: 'Advanced' },
    { id: 5, title: 'Robotics API Integration', difficulty: 'Advanced' }
  ];

  const runCode = () => {
    console.log('Code execution simulated:', code);
    alert('Code executed successfully! Check console for output.');
  };

  return (
    <div className="coding-framework">
      <div className="coding-header">
        <h1>Educational Coding Framework</h1>
        <div className="tabs">
          <button 
            className={activeTab === 'editor' ? 'active' : ''}
            onClick={() => setActiveTab('editor')}
          >
            💻 Code Editor
          </button>
          <button 
            className={activeTab === 'tutorials' ? 'active' : ''}
            onClick={() => setActiveTab('tutorials')}
          >
            📚 Tutorials
          </button>
          <button 
            className={activeTab === 'plugins' ? 'active' : ''}
            onClick={() => setActiveTab('plugins')}
          >
            🔌 Plugins
          </button>
        </div>
      </div>

      {activeTab === 'editor' && (
        <div className="code-editor-section">
          <div className="editor-toolbar">
            <button onClick={runCode} className="run-btn">▶️ Run Code</button>
            <button className="save-btn">💾 Save</button>
            <button className="reset-btn">🔄 Reset</button>
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Write your Python code here..."
          />
          <div className="output-panel">
            <h4>Output Console</h4>
            <div className="console">
              <p>Ready to execute code...</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tutorials' && (
        <div className="tutorials-section">
          <h3>Interactive Learning Modules</h3>
          <div className="tutorial-grid">
            {tutorials.map(tutorial => (
              <div key={tutorial.id} className="tutorial-card">
                <h4>{tutorial.title}</h4>
                <span className={`difficulty ${tutorial.difficulty.toLowerCase()}`}>
                  {tutorial.difficulty}
                </span>
                <p>Learn how to customize and extend the application functionality.</p>
                <button className="start-btn">Start Tutorial</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'plugins' && (
        <div className="plugins-section">
          <h3>Plugin Management</h3>
          <div className="plugin-categories">
            <div className="category">
              <h4>🤖 Robotics Extensions</h4>
              <p>Plugins for robot control and automation</p>
              <button className="explore-btn">Explore</button>
            </div>
            <div className="category">
              <h4>🚀 Space Venture Tools</h4>
              <p>Future modules for spacecraft design</p>
              <button className="explore-btn">Coming Soon</button>
            </div>
            <div className="category">
              <h4>📊 Custom Analytics</h4>
              <p>Advanced reporting and visualization</p>
              <button className="explore-btn">Explore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CodingFramework;