"""
WebSocket Server for Real-time Communication
Enables 5-second update cycles and team communication
"""

import asyncio
import websockets
import json
import sqlite3
import threading
import time
from datetime import datetime
import sys
import os

# Add database path
sys.path.append(r"C:\Users\Tewedros\Desktop\teddy_cleaning_app_v2")
from database.db_manager import DatabaseManager

class WebSocketServer:
    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self.db_manager = DatabaseManager()
        self.db_manager.initialize_database()
        
    async def register_client(self, websocket, path):
        """Register new client connection"""
        self.clients.add(websocket)
        print(f"Client connected. Total clients: {len(self.clients)}")
        
        try:
            # Send initial data
            await self.send_dashboard_update(websocket)
            
            # Listen for messages
            async for message in websocket:
                await self.handle_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.remove(websocket)
            print(f"Client disconnected. Total clients: {len(self.clients)}")
    
    async def handle_message(self, websocket, message):
        """Handle incoming messages from clients"""
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'team_message':
                await self.broadcast_team_message(data)
            elif msg_type == 'job_update':
                await self.handle_job_update(data)
            elif msg_type == 'gps_update':
                await self.handle_gps_update(data)
                
        except json.JSONDecodeError:
            print(f"Invalid JSON received: {message}")
    
    async def broadcast_team_message(self, data):
        """Broadcast team message to all clients"""
        message = {
            'type': 'team_message',
            'sender': data.get('sender', 'Unknown'),
            'message': data.get('message', ''),
            'timestamp': datetime.now().strftime("%H:%M:%S")
        }
        
        await self.broadcast(json.dumps(message))
    
    async def handle_job_update(self, data):
        """Handle job status updates"""
        job_id = data.get('job_id')
        status = data.get('status')
        
        if job_id and status:
            # Update database
            self.db_manager.execute(
                "UPDATE jobs SET status = ? WHERE id = ?",
                (status, job_id)
            )
            
            # Broadcast update
            update = {
                'type': 'job_update',
                'job_id': job_id,
                'status': status,
                'timestamp': datetime.now().isoformat()
            }
            
            await self.broadcast(json.dumps(update))
    
    async def handle_gps_update(self, data):
        """Handle GPS location updates"""
        team_id = data.get('team_id')
        lat = data.get('lat')
        lng = data.get('lng')
        
        if team_id and lat and lng:
            update = {
                'type': 'gps_update',
                'team_id': team_id,
                'lat': lat,
                'lng': lng,
                'timestamp': datetime.now().isoformat()
            }
            
            await self.broadcast(json.dumps(update))
    
    async def send_dashboard_update(self, websocket=None):
        """Send dashboard data update"""
        dashboard_data = self.db_manager.get_dashboard_data()
        
        update = {
            'type': 'dashboard_update',
            'data': dashboard_data,
            'timestamp': datetime.now().isoformat()
        }
        
        message = json.dumps(update, default=str)
        
        if websocket:
            await websocket.send(message)
        else:
            await self.broadcast(message)
    
    async def broadcast(self, message):
        """Broadcast message to all connected clients"""
        if self.clients:
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
    
    def start_periodic_updates(self):
        """Start periodic dashboard updates"""
        async def update_loop():
            while True:
                await asyncio.sleep(5)  # 5-second intervals
                await self.send_dashboard_update()
        
        asyncio.create_task(update_loop())
    
    async def start_server(self):
        """Start the WebSocket server"""
        print(f"Starting WebSocket server on {self.host}:{self.port}")
        
        # Start periodic updates
        self.start_periodic_updates()
        
        # Start server
        async with websockets.serve(self.register_client, self.host, self.port):
            print("WebSocket server running...")
            await asyncio.Future()  # Run forever

def main():
    server = WebSocketServer()
    asyncio.run(server.start_server())

if __name__ == "__main__":
    main()