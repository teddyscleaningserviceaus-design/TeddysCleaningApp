"""
Mobile API Bridge - Connects mobile app to desktop command center
Real-time synchronization between React Native mobile app and desktop
"""

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import sqlite3
import json
from datetime import datetime
import threading
import sys
import os

# Add database path
sys.path.append(r"C:\Users\Tewedros\Desktop\teddy_cleaning_app_v2")
from database.db_manager import DatabaseManager

app = Flask(__name__)
app.config['SECRET_KEY'] = 'teddy_cleaning_secret'
socketio = SocketIO(app, cors_allowed_origins="*")

class MobileAPIBridge:
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.db_manager.initialize_database()
        self.connected_clients = {}
    
    def get_dashboard_data(self):
        """Get real-time dashboard data for mobile"""
        return self.db_manager.get_dashboard_data()
    
    def get_active_jobs(self):
        """Get active jobs for mobile display"""
        return self.db_manager.fetch_all("""
            SELECT j.*, c.name as client_name 
            FROM jobs j 
            LEFT JOIN clients c ON j.client_id = c.id 
            WHERE j.status IN ('Scheduled', 'In Progress')
            ORDER BY j.job_date, j.job_time
        """)
    
    def update_job_status(self, job_id, status, team_id=None):
        """Update job status from mobile"""
        success = self.db_manager.execute(
            "UPDATE jobs SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?",
            (status, job_id)
        )
        
        if success:
            # Broadcast update to all clients
            socketio.emit('job_update', {
                'job_id': job_id,
                'status': status,
                'team_id': team_id,
                'timestamp': datetime.now().isoformat()
            })
        
        return success
    
    def update_team_location(self, team_id, lat, lng):
        """Update team GPS location from mobile"""
        # Broadcast location update
        socketio.emit('location_update', {
            'team_id': team_id,
            'lat': lat,
            'lng': lng,
            'timestamp': datetime.now().isoformat()
        })
        
        return True
    
    def send_team_message(self, sender, message, team_id=None):
        """Send team message from mobile"""
        socketio.emit('team_message', {
            'sender': sender,
            'message': message,
            'team_id': team_id,
            'timestamp': datetime.now().strftime("%H:%M:%S")
        })
        
        return True

# Initialize bridge
bridge = MobileAPIBridge()

# REST API Endpoints
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Get dashboard data"""
    try:
        data = bridge.get_dashboard_data()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """Get active jobs"""
    try:
        jobs = bridge.get_active_jobs()
        return jsonify({'success': True, 'jobs': jobs})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/jobs/<int:job_id>/status', methods=['PUT'])
def update_job_status(job_id):
    """Update job status"""
    try:
        data = request.get_json()
        status = data.get('status')
        team_id = data.get('team_id')
        
        success = bridge.update_job_status(job_id, status, team_id)
        
        if success:
            return jsonify({'success': True, 'message': 'Job status updated'})
        else:
            return jsonify({'success': False, 'error': 'Failed to update job'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/teams/<team_id>/location', methods=['PUT'])
def update_team_location(team_id):
    """Update team GPS location"""
    try:
        data = request.get_json()
        lat = data.get('lat')
        lng = data.get('lng')
        
        success = bridge.update_team_location(team_id, lat, lng)
        
        if success:
            return jsonify({'success': True, 'message': 'Location updated'})
        else:
            return jsonify({'success': False, 'error': 'Failed to update location'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/messages', methods=['POST'])
def send_message():
    """Send team message"""
    try:
        data = request.get_json()
        sender = data.get('sender')
        message = data.get('message')
        team_id = data.get('team_id')
        
        success = bridge.send_team_message(sender, message, team_id)
        
        if success:
            return jsonify({'success': True, 'message': 'Message sent'})
        else:
            return jsonify({'success': False, 'error': 'Failed to send message'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    client_id = request.sid
    bridge.connected_clients[client_id] = {
        'connected_at': datetime.now(),
        'type': 'mobile'
    }
    
    print(f"Mobile client connected: {client_id}")
    
    # Send initial data
    emit('initial_data', {
        'dashboard': bridge.get_dashboard_data(),
        'jobs': bridge.get_active_jobs()
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    client_id = request.sid
    if client_id in bridge.connected_clients:
        del bridge.connected_clients[client_id]
    
    print(f"Mobile client disconnected: {client_id}")

@socketio.on('mobile_sync')
def handle_mobile_sync(data):
    """Handle mobile synchronization request"""
    sync_type = data.get('type')
    
    if sync_type == 'job_update':
        job_id = data.get('job_id')
        status = data.get('status')
        team_id = data.get('team_id')
        
        bridge.update_job_status(job_id, status, team_id)
        
    elif sync_type == 'location_update':
        team_id = data.get('team_id')
        lat = data.get('lat')
        lng = data.get('lng')
        
        bridge.update_team_location(team_id, lat, lng)
        
    elif sync_type == 'message':
        sender = data.get('sender')
        message = data.get('message')
        team_id = data.get('team_id')
        
        bridge.send_team_message(sender, message, team_id)

def start_mobile_api_server():
    """Start the mobile API server"""
    print("Starting Mobile API Bridge on http://localhost:5000")
    print("WebSocket endpoint: ws://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)

if __name__ == "__main__":
    start_mobile_api_server()