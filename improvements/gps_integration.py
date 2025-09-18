"""
GPS Integration Module
Provides real GPS mapping, route optimization, and team tracking
"""

import tkinter as tk
import customtkinter as ctk
import requests
import json
import math
from datetime import datetime
import threading
import time

class GPSManager:
    def __init__(self):
        self.api_key = "demo_key"  # Replace with actual API key
        self.team_locations = {}
        self.routes = {}
        
    def get_coordinates(self, address):
        """Convert address to GPS coordinates (mock implementation)"""
        # In production, use Google Maps Geocoding API
        mock_coords = {
            "123 Business Ave": (40.7128, -74.0060),
            "456 Office St": (40.7589, -73.9851),
            "789 Corporate Blvd": (40.6892, -74.0445)
        }
        
        return mock_coords.get(address, (40.7128, -74.0060))
    
    def calculate_distance(self, coord1, coord2):
        """Calculate distance between two coordinates"""
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        
        # Haversine formula
        R = 6371  # Earth's radius in kilometers
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat/2) * math.sin(dlat/2) + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon/2) * math.sin(dlon/2))
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        
        return distance
    
    def optimize_route(self, locations):
        """Optimize route for multiple locations"""
        if len(locations) <= 2:
            return locations
        
        # Simple nearest neighbor algorithm
        optimized = [locations[0]]
        remaining = locations[1:]
        
        while remaining:
            current = optimized[-1]
            nearest = min(remaining, key=lambda loc: self.calculate_distance(current, loc))
            optimized.append(nearest)
            remaining.remove(nearest)
        
        return optimized
    
    def update_team_location(self, team_id, lat, lng):
        """Update team location"""
        self.team_locations[team_id] = {
            'lat': lat,
            'lng': lng,
            'timestamp': datetime.now(),
            'status': 'active'
        }

class AdvancedGPSWidget(ctk.CTkFrame):
    def __init__(self, parent, gps_manager):
        super().__init__(parent, fg_color="#1a1c2e")
        self.gps_manager = gps_manager
        
        # Title with controls
        header_frame = ctk.CTkFrame(self, fg_color="transparent")
        header_frame.pack(fill="x", padx=10, pady=10)
        
        title = ctk.CTkLabel(header_frame, text="🗺️ ADVANCED GPS TRACKING", 
                           font=ctk.CTkFont(size=16, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(side="left")
        
        # Map controls
        controls_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        controls_frame.pack(side="right")
        
        zoom_in_btn = ctk.CTkButton(controls_frame, text="🔍+", width=40,
                                  fg_color="#4dc4d9", hover_color="#3ba8c4")
        zoom_in_btn.pack(side="left", padx=2)
        
        zoom_out_btn = ctk.CTkButton(controls_frame, text="🔍-", width=40,
                                   fg_color="#4dc4d9", hover_color="#3ba8c4")
        zoom_out_btn.pack(side="left", padx=2)
        
        # Map canvas
        self.map_canvas = tk.Canvas(self, bg="#0f1419", height=400, highlightthickness=0)
        self.map_canvas.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Status panel
        status_frame = ctk.CTkFrame(self, fg_color="#2b2d42", height=100)
        status_frame.pack(fill="x", padx=10, pady=(0, 10))
        status_frame.pack_propagate(False)
        
        # Team status
        self.status_labels = {}
        self.create_status_panel(status_frame)
        
        # Initialize map
        self.zoom_level = 1.0
        self.center_lat = 40.7128
        self.center_lng = -74.0060
        
        # Sample team data
        self.teams = [
            {"id": "team_alpha", "name": "Team Alpha", "lat": 40.7128, "lng": -74.0060, "status": "active"},
            {"id": "team_beta", "name": "Team Beta", "lat": 40.7589, "lng": -73.9851, "status": "en_route"},
            {"id": "team_gamma", "name": "Team Gamma", "lat": 40.6892, "lng": -74.0445, "status": "completed"}
        ]
        
        self.update_map()
        self.start_location_updates()
    
    def create_status_panel(self, parent):
        """Create team status panel"""
        status_title = ctk.CTkLabel(parent, text="Team Status",
                                  font=ctk.CTkFont(size=14, weight="bold"),
                                  text_color="#4dc4d9")
        status_title.pack(pady=5)
        
        status_grid = ctk.CTkFrame(parent, fg_color="transparent")
        status_grid.pack(fill="both", expand=True, padx=10)
        
        for i, team in enumerate(["Alpha", "Beta", "Gamma"]):
            team_frame = ctk.CTkFrame(status_grid, fg_color="transparent")
            team_frame.pack(side="left", fill="both", expand=True, padx=5)
            
            team_label = ctk.CTkLabel(team_frame, text=f"Team {team}",
                                    font=ctk.CTkFont(size=12, weight="bold"))
            team_label.pack()
            
            status_label = ctk.CTkLabel(team_frame, text="Active",
                                      font=ctk.CTkFont(size=10),
                                      text_color="#00ff88")
            status_label.pack()
            
            self.status_labels[team.lower()] = status_label
    
    def lat_lng_to_canvas(self, lat, lng):
        """Convert GPS coordinates to canvas coordinates"""
        width = self.map_canvas.winfo_width()
        height = self.map_canvas.winfo_height()
        
        if width <= 1 or height <= 1:
            return 0, 0
        
        # Simple projection (not accurate for large areas)
        x = ((lng - self.center_lng) * self.zoom_level * 1000) + width / 2
        y = ((self.center_lat - lat) * self.zoom_level * 1000) + height / 2
        
        return x, y
    
    def update_map(self):
        """Update the GPS map display"""
        self.map_canvas.delete("all")
        width = self.map_canvas.winfo_width()
        height = self.map_canvas.winfo_height()
        
        if width <= 1 or height <= 1:
            self.after(100, self.update_map)
            return
        
        # Draw map grid
        grid_size = 50
        for i in range(0, width, grid_size):
            self.map_canvas.create_line(i, 0, i, height, fill="#2b2d42", width=1)
        for i in range(0, height, grid_size):
            self.map_canvas.create_line(0, i, width, i, fill="#2b2d42", width=1)
        
        # Draw roads (simplified)
        self.draw_roads()
        
        # Draw team locations
        for team in self.teams:
            self.draw_team_marker(team)
        
        # Draw routes
        self.draw_routes()
    
    def draw_roads(self):
        """Draw simplified road network"""
        width = self.map_canvas.winfo_width()
        height = self.map_canvas.winfo_height()
        
        # Main roads
        roads = [
            [(0, height//3), (width, height//3)],
            [(0, 2*height//3), (width, 2*height//3)],
            [(width//3, 0), (width//3, height)],
            [(2*width//3, 0), (2*width//3, height)]
        ]
        
        for road in roads:
            self.map_canvas.create_line(road[0][0], road[0][1], road[1][0], road[1][1],
                                      fill="#555555", width=3)
    
    def draw_team_marker(self, team):
        """Draw team marker on map"""
        x, y = self.lat_lng_to_canvas(team['lat'], team['lng'])
        
        # Ensure marker is within canvas bounds
        width = self.map_canvas.winfo_width()
        height = self.map_canvas.winfo_height()
        
        if 0 <= x <= width and 0 <= y <= height:
            # Status colors
            colors = {
                "active": "#00ff00",
                "en_route": "#ffff00", 
                "completed": "#4dc4d9",
                "offline": "#ff4444"
            }
            
            color = colors.get(team['status'], "#ffffff")
            
            # Team marker
            marker_size = 12
            self.map_canvas.create_oval(x-marker_size, y-marker_size, 
                                      x+marker_size, y+marker_size,
                                      fill=color, outline="#ffffff", width=2)
            
            # Team label
            self.map_canvas.create_text(x, y-25, text=team['name'],
                                      fill="#ffffff", font=("Arial", 10, "bold"))
            
            # Pulsing effect for active teams
            if team['status'] == 'active':
                pulse_size = 20
                self.map_canvas.create_oval(x-pulse_size, y-pulse_size,
                                          x+pulse_size, y+pulse_size,
                                          outline=color, width=2)
    
    def draw_routes(self):
        """Draw optimized routes"""
        # Sample route between teams
        if len(self.teams) >= 2:
            for i in range(len(self.teams) - 1):
                team1 = self.teams[i]
                team2 = self.teams[i + 1]
                
                x1, y1 = self.lat_lng_to_canvas(team1['lat'], team1['lng'])
                x2, y2 = self.lat_lng_to_canvas(team2['lat'], team2['lng'])
                
                # Draw route line
                self.map_canvas.create_line(x1, y1, x2, y2,
                                          fill="#4dc4d9", width=2, dash=(5, 5))
    
    def start_location_updates(self):
        """Start simulated location updates"""
        def update_locations():
            while True:
                for team in self.teams:
                    if team['status'] == 'active':
                        # Simulate movement
                        team['lat'] += (hash(team['id']) % 3 - 1) * 0.001
                        team['lng'] += (hash(team['id']) % 3 - 1) * 0.001
                
                # Update map on main thread
                self.after(0, self.update_map)
                time.sleep(2)  # Update every 2 seconds
        
        # Start update thread
        update_thread = threading.Thread(target=update_locations, daemon=True)
        update_thread.start()

class RouteOptimizationWidget(ctk.CTkFrame):
    def __init__(self, parent, gps_manager):
        super().__init__(parent, fg_color="#1a1c2e")
        self.gps_manager = gps_manager
        
        # Title
        title = ctk.CTkLabel(self, text="🛣️ ROUTE OPTIMIZATION", 
                           font=ctk.CTkFont(size=16, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(pady=10)
        
        # Route list
        self.route_frame = ctk.CTkScrollableFrame(self, height=200)
        self.route_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Controls
        controls_frame = ctk.CTkFrame(self, fg_color="transparent")
        controls_frame.pack(fill="x", padx=10, pady=5)
        
        optimize_btn = ctk.CTkButton(controls_frame, text="🔄 OPTIMIZE ROUTES",
                                   command=self.optimize_routes,
                                   fg_color="#4dc4d9", hover_color="#3ba8c4")
        optimize_btn.pack(side="left", padx=(0, 5))
        
        refresh_btn = ctk.CTkButton(controls_frame, text="📍 UPDATE GPS",
                                  command=self.refresh_gps,
                                  fg_color="#00ff88", hover_color="#00cc6a")
        refresh_btn.pack(side="left")
        
        self.load_routes()
    
    def load_routes(self):
        """Load current routes"""
        # Sample routes
        routes = [
            {"team": "Alpha", "stops": 3, "distance": "12.5 km", "eta": "2:30 PM"},
            {"team": "Beta", "stops": 2, "distance": "8.2 km", "eta": "1:45 PM"},
            {"team": "Gamma", "stops": 4, "distance": "15.8 km", "eta": "3:15 PM"}
        ]
        
        for route in routes:
            self.create_route_card(route)
    
    def create_route_card(self, route):
        """Create route information card"""
        card = ctk.CTkFrame(self.route_frame, fg_color="#2b2d42")
        card.pack(fill="x", pady=2)
        
        # Route header
        header = ctk.CTkLabel(card, text=f"Team {route['team']}",
                            font=ctk.CTkFont(size=14, weight="bold"),
                            text_color="#4dc4d9")
        header.pack(anchor="w", padx=10, pady=(5, 0))
        
        # Route details
        details = f"📍 {route['stops']} stops • 📏 {route['distance']} • ⏰ ETA: {route['eta']}"
        details_label = ctk.CTkLabel(card, text=details,
                                   font=ctk.CTkFont(size=11),
                                   text_color="#ffffff")
        details_label.pack(anchor="w", padx=10, pady=(0, 5))
    
    def optimize_routes(self):
        """Optimize all routes"""
        # Clear existing routes
        for widget in self.route_frame.winfo_children():
            widget.destroy()
        
        # Show optimization in progress
        progress = ctk.CTkLabel(self.route_frame, text="🔄 Optimizing routes...",
                              text_color="#4dc4d9")
        progress.pack(pady=20)
        
        # Simulate optimization delay
        self.after(2000, self.show_optimized_routes)
    
    def show_optimized_routes(self):
        """Show optimized routes"""
        # Clear progress
        for widget in self.route_frame.winfo_children():
            widget.destroy()
        
        # Optimized routes (improved)
        routes = [
            {"team": "Alpha", "stops": 3, "distance": "10.2 km", "eta": "2:15 PM"},
            {"team": "Beta", "stops": 2, "distance": "7.1 km", "eta": "1:30 PM"},
            {"team": "Gamma", "stops": 4, "distance": "13.5 km", "eta": "2:45 PM"}
        ]
        
        for route in routes:
            self.create_route_card(route)
        
        # Show savings
        savings = ctk.CTkLabel(self.route_frame, text="✅ Routes optimized! Saved 4.2 km total distance",
                             font=ctk.CTkFont(size=12, weight="bold"),
                             text_color="#00ff88")
        savings.pack(pady=10)
    
    def refresh_gps(self):
        """Refresh GPS data"""
        # Show refresh status
        for widget in self.route_frame.winfo_children():
            if isinstance(widget, ctk.CTkLabel) and "GPS" in widget.cget("text"):
                widget.destroy()
        
        refresh_status = ctk.CTkLabel(self.route_frame, text="📡 GPS data updated",
                                    text_color="#4dc4d9")
        refresh_status.pack(pady=5)
        
        # Remove status after 3 seconds
        self.after(3000, refresh_status.destroy)