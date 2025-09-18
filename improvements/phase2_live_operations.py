"""
Phase 2: Live Operations Center
Connects visual revolution to real database functionality with GPS, real-time updates, and team communication.
"""

import customtkinter as ctk
import tkinter as tk
from tkinter import ttk
import sqlite3
import threading
import time
import json
import random
import math
from datetime import datetime, timedelta
import sys
import os

# Add database path
sys.path.append(r"C:\Users\Tewedros\Desktop\teddy_cleaning_app_v2")
from database.db_manager import DatabaseManager

class ParticleSystem:
    def __init__(self, canvas, width, height):
        self.canvas = canvas
        self.width = width
        self.height = height
        self.particles = []
        self.create_particles()
    
    def create_particles(self):
        for _ in range(30):
            self.particles.append({
                'x': random.randint(0, self.width),
                'y': random.randint(0, self.height),
                'vx': random.uniform(-0.5, 0.5),
                'vy': random.uniform(-0.5, 0.5),
                'size': random.randint(1, 3)
            })
    
    def update(self):
        self.canvas.delete("particle")
        for particle in self.particles:
            particle['x'] += particle['vx']
            particle['y'] += particle['vy']
            
            if particle['x'] < 0 or particle['x'] > self.width:
                particle['vx'] *= -1
            if particle['y'] < 0 or particle['y'] > self.height:
                particle['vy'] *= -1
            
            self.canvas.create_oval(
                particle['x'], particle['y'],
                particle['x'] + particle['size'], particle['y'] + particle['size'],
                fill="#4dc4d9", outline="", tags="particle"
            )

class GPSMapWidget(ctk.CTkFrame):
    def __init__(self, parent):
        super().__init__(parent, fg_color="#1a1c2e")
        
        # Title
        title = ctk.CTkLabel(self, text="🗺️ LIVE GPS TRACKING", 
                           font=ctk.CTkFont(size=16, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(pady=10)
        
        # Map canvas
        self.map_canvas = tk.Canvas(self, bg="#0f1419", height=300, highlightthickness=0)
        self.map_canvas.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Team locations (simulated)
        self.team_locations = [
            {"name": "Team Alpha", "lat": 40.7128, "lng": -74.0060, "status": "active"},
            {"name": "Team Beta", "lat": 40.7589, "lng": -73.9851, "status": "en_route"},
            {"name": "Team Gamma", "lat": 40.6892, "lng": -74.0445, "status": "completed"}
        ]
        
        self.update_map()
        
    def update_map(self):
        self.map_canvas.delete("all")
        width = self.map_canvas.winfo_width()
        height = self.map_canvas.winfo_height()
        
        if width <= 1 or height <= 1:
            self.after(100, self.update_map)
            return
        
        # Draw grid
        for i in range(0, width, 50):
            self.map_canvas.create_line(i, 0, i, height, fill="#2b2d42", width=1)
        for i in range(0, height, 50):
            self.map_canvas.create_line(0, i, width, i, fill="#2b2d42", width=1)
        
        # Draw team locations
        for i, team in enumerate(self.team_locations):
            x = (i + 1) * width // (len(self.team_locations) + 1)
            y = height // 2 + random.randint(-50, 50)
            
            color = {"active": "#00ff00", "en_route": "#ffff00", "completed": "#4dc4d9"}[team["status"]]
            
            # Team marker
            self.map_canvas.create_oval(x-8, y-8, x+8, y+8, fill=color, outline="#ffffff", width=2)
            self.map_canvas.create_text(x, y-20, text=team["name"], fill="#ffffff", font=("Arial", 10))
            
            # Pulsing effect for active teams
            if team["status"] == "active":
                self.map_canvas.create_oval(x-15, y-15, x+15, y+15, outline=color, width=2)

class LiveKPIWidget(ctk.CTkFrame):
    def __init__(self, parent, title, value, unit="", color="#4dc4d9"):
        super().__init__(parent, fg_color="#1a1c2e", corner_radius=10)
        
        self.title = title
        self.color = color
        
        # Title
        title_label = ctk.CTkLabel(self, text=title, 
                                 font=ctk.CTkFont(size=12, weight="bold"),
                                 text_color="#8892b0")
        title_label.pack(pady=(10, 5))
        
        # Value
        self.value_label = ctk.CTkLabel(self, text=f"{value}{unit}",
                                      font=ctk.CTkFont(size=24, weight="bold"),
                                      text_color=color)
        self.value_label.pack(pady=(0, 10))
        
        # Pulse effect
        self.pulse_active = True
        self.pulse_animation()
    
    def update_value(self, value, unit=""):
        self.value_label.configure(text=f"{value}{unit}")
    
    def pulse_animation(self):
        if self.pulse_active:
            current_color = self.value_label.cget("text_color")
            if current_color == self.color:
                self.value_label.configure(text_color="#ffffff")
            else:
                self.value_label.configure(text_color=self.color)
            
            self.after(1000, self.pulse_animation)

class TeamCommunicationWidget(ctk.CTkFrame):
    def __init__(self, parent):
        super().__init__(parent, fg_color="#1a1c2e")
        
        # Title
        title = ctk.CTkLabel(self, text="💬 TEAM COMMUNICATION", 
                           font=ctk.CTkFont(size=16, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(pady=10)
        
        # Messages area
        self.messages_frame = ctk.CTkScrollableFrame(self, height=200)
        self.messages_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Input area
        input_frame = ctk.CTkFrame(self, fg_color="transparent")
        input_frame.pack(fill="x", padx=10, pady=5)
        
        self.message_entry = ctk.CTkEntry(input_frame, placeholder_text="Type message...")
        self.message_entry.pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        send_btn = ctk.CTkButton(input_frame, text="SEND", width=60,
                               fg_color="#4dc4d9", hover_color="#3ba8c4")
        send_btn.pack(side="right")
        
        # Sample messages
        self.add_message("Team Alpha", "Job at 123 Main St completed ✅", "10:30 AM")
        self.add_message("Dispatch", "Team Beta, proceed to next location", "10:32 AM")
        self.add_message("Team Gamma", "Equipment issue resolved 🔧", "10:35 AM")
    
    def add_message(self, sender, message, time):
        msg_frame = ctk.CTkFrame(self.messages_frame, fg_color="#2b2d42")
        msg_frame.pack(fill="x", pady=2)
        
        header = ctk.CTkLabel(msg_frame, text=f"{sender} • {time}",
                            font=ctk.CTkFont(size=10, weight="bold"),
                            text_color="#4dc4d9")
        header.pack(anchor="w", padx=10, pady=(5, 0))
        
        content = ctk.CTkLabel(msg_frame, text=message,
                             font=ctk.CTkFont(size=12),
                             text_color="#ffffff")
        content.pack(anchor="w", padx=10, pady=(0, 5))

class JobManagementWidget(ctk.CTkFrame):
    def __init__(self, parent, db_manager):
        super().__init__(parent, fg_color="#1a1c2e")
        self.db_manager = db_manager
        
        # Title
        title = ctk.CTkLabel(self, text="📋 ACTIVE JOBS", 
                           font=ctk.CTkFont(size=16, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(pady=10)
        
        # Jobs list
        self.jobs_frame = ctk.CTkScrollableFrame(self, height=300)
        self.jobs_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Control buttons
        controls_frame = ctk.CTkFrame(self, fg_color="transparent")
        controls_frame.pack(fill="x", padx=10, pady=5)
        
        refresh_btn = ctk.CTkButton(controls_frame, text="🔄 REFRESH",
                                  command=self.refresh_jobs,
                                  fg_color="#4dc4d9", hover_color="#3ba8c4")
        refresh_btn.pack(side="left", padx=(0, 5))
        
        new_job_btn = ctk.CTkButton(controls_frame, text="➕ NEW JOB",
                                  fg_color="#00ff88", hover_color="#00cc6a")
        new_job_btn.pack(side="left")
        
        self.refresh_jobs()
    
    def refresh_jobs(self):
        # Clear existing jobs
        for widget in self.jobs_frame.winfo_children():
            widget.destroy()
        
        # Get jobs from database
        jobs = self.db_manager.fetch_all("""
            SELECT j.*, c.name as client_name 
            FROM jobs j 
            LEFT JOIN clients c ON j.client_id = c.id 
            WHERE j.status = 'Scheduled' 
            ORDER BY j.job_date, j.job_time
        """)
        
        if not jobs:
            no_jobs = ctk.CTkLabel(self.jobs_frame, text="No active jobs",
                                 text_color="#8892b0")
            no_jobs.pack(pady=20)
            return
        
        for job in jobs:
            self.create_job_card(job)
    
    def create_job_card(self, job):
        card = ctk.CTkFrame(self.jobs_frame, fg_color="#2b2d42")
        card.pack(fill="x", pady=2)
        
        # Job header
        header_frame = ctk.CTkFrame(card, fg_color="transparent")
        header_frame.pack(fill="x", padx=10, pady=5)
        
        client_label = ctk.CTkLabel(header_frame, 
                                  text=job.get('client_name', 'Unknown Client'),
                                  font=ctk.CTkFont(size=14, weight="bold"),
                                  text_color="#4dc4d9")
        client_label.pack(side="left")
        
        status_label = ctk.CTkLabel(header_frame, text=job['status'],
                                  font=ctk.CTkFont(size=10),
                                  text_color="#00ff88")
        status_label.pack(side="right")
        
        # Job details
        details = f"📅 {job['job_date']} ⏰ {job['job_time']}\n🏠 {job['location']}\n🔧 {job['service_type']}"
        details_label = ctk.CTkLabel(card, text=details,
                                   font=ctk.CTkFont(size=11),
                                   text_color="#ffffff",
                                   justify="left")
        details_label.pack(anchor="w", padx=10, pady=(0, 10))

class LiveOperationsCenter(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # Initialize database
        self.db_manager = DatabaseManager()
        self.db_manager.initialize_database()
        
        # Window setup
        self.title("Teddy's Cleaning - Live Operations Center")
        self.geometry("1400x900")
        
        # Color scheme
        self.configure(fg_color="#0f1419")
        ctk.set_appearance_mode("dark")
        
        # Create background canvas for particles
        self.bg_canvas = tk.Canvas(self, highlightthickness=0)
        self.bg_canvas.place(x=0, y=0, relwidth=1, relheight=1)
        
        # Initialize particle system
        self.update_idletasks()
        canvas_width = self.winfo_width()
        canvas_height = self.winfo_height()
        self.particle_system = ParticleSystem(self.bg_canvas, canvas_width, canvas_height)
        
        self.setup_ui()
        self.start_real_time_updates()
        
        # Bind resize event
        self.bind("<Configure>", self.on_resize)
    
    def on_resize(self, event):
        if event.widget == self:
            self.bg_canvas.configure(width=event.width, height=event.height)
            self.particle_system.width = event.width
            self.particle_system.height = event.height
    
    def setup_ui(self):
        # Main container
        main_frame = ctk.CTkFrame(self, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Header
        header_frame = ctk.CTkFrame(main_frame, fg_color="#1a1c2e", height=80)
        header_frame.pack(fill="x", pady=(0, 20))
        header_frame.pack_propagate(False)
        
        # Title with live indicator
        title_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        title_frame.pack(expand=True, fill="both")
        
        title = ctk.CTkLabel(title_frame, text="🚀 TEDDY'S COMMAND CENTER",
                           font=ctk.CTkFont(size=28, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(side="left", padx=20, pady=20)
        
        # Live indicator
        self.live_indicator = ctk.CTkLabel(title_frame, text="🔴 LIVE",
                                         font=ctk.CTkFont(size=14, weight="bold"),
                                         text_color="#ff4444")
        self.live_indicator.pack(side="right", padx=20, pady=20)
        
        # Content area
        content_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        content_frame.pack(fill="both", expand=True)
        
        # Left panel - KPIs and GPS
        left_panel = ctk.CTkFrame(content_frame, fg_color="transparent", width=450)
        left_panel.pack(side="left", fill="y", padx=(0, 10))
        left_panel.pack_propagate(False)
        
        # KPI Grid
        kpi_frame = ctk.CTkFrame(left_panel, fg_color="transparent")
        kpi_frame.pack(fill="x", pady=(0, 10))
        
        # Get dashboard data
        dashboard_data = self.db_manager.get_dashboard_data()
        
        # Create KPI widgets
        self.kpi_widgets = {}
        
        kpi_grid = ctk.CTkFrame(kpi_frame, fg_color="transparent")
        kpi_grid.pack(fill="x")
        
        # Row 1
        row1 = ctk.CTkFrame(kpi_grid, fg_color="transparent")
        row1.pack(fill="x", pady=(0, 5))
        
        self.kpi_widgets['jobs'] = LiveKPIWidget(row1, "ACTIVE JOBS", 
                                               dashboard_data['pending_jobs'], color="#00ff88")
        self.kpi_widgets['jobs'].pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        self.kpi_widgets['revenue'] = LiveKPIWidget(row1, "REVENUE", 
                                                  f"${dashboard_data['revenue_this_month']:,.0f}", color="#4dc4d9")
        self.kpi_widgets['revenue'].pack(side="left", fill="x", expand=True)
        
        # Row 2
        row2 = ctk.CTkFrame(kpi_grid, fg_color="transparent")
        row2.pack(fill="x")
        
        self.kpi_widgets['teams'] = LiveKPIWidget(row2, "ACTIVE TEAMS", 
                                                dashboard_data['active_staff'], color="#ff6b6b")
        self.kpi_widgets['teams'].pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        self.kpi_widgets['clients'] = LiveKPIWidget(row2, "CLIENTS", 
                                                  dashboard_data['active_clients'], color="#ffd93d")
        self.kpi_widgets['clients'].pack(side="left", fill="x", expand=True)
        
        # GPS Map
        self.gps_widget = GPSMapWidget(left_panel)
        self.gps_widget.pack(fill="both", expand=True)
        
        # Right panel - Jobs and Communication
        right_panel = ctk.CTkFrame(content_frame, fg_color="transparent")
        right_panel.pack(side="right", fill="both", expand=True)
        
        # Jobs management
        self.jobs_widget = JobManagementWidget(right_panel, self.db_manager)
        self.jobs_widget.pack(fill="both", expand=True, pady=(0, 10))
        
        # Team communication
        self.comm_widget = TeamCommunicationWidget(right_panel)
        self.comm_widget.pack(fill="x", pady=(0, 0))
    
    def start_real_time_updates(self):
        """Start real-time update threads"""
        def update_loop():
            while True:
                try:
                    # Update particles
                    self.after(0, self.particle_system.update)
                    
                    # Update live indicator
                    self.after(0, self.toggle_live_indicator)
                    
                    # Update GPS map
                    self.after(0, self.gps_widget.update_map)
                    
                    # Update KPIs every 5 seconds
                    if hasattr(self, 'update_counter'):
                        self.update_counter += 1
                    else:
                        self.update_counter = 0
                    
                    if self.update_counter % 50 == 0:  # Every 5 seconds
                        self.after(0, self.update_kpis)
                    
                    time.sleep(0.1)  # 10 FPS
                except Exception as e:
                    print(f"Update error: {e}")
                    time.sleep(1)
        
        # Start update thread
        update_thread = threading.Thread(target=update_loop, daemon=True)
        update_thread.start()
    
    def toggle_live_indicator(self):
        current_color = self.live_indicator.cget("text_color")
        if current_color == "#ff4444":
            self.live_indicator.configure(text_color="#ffffff")
        else:
            self.live_indicator.configure(text_color="#ff4444")
    
    def update_kpis(self):
        """Update KPI values with fresh data"""
        try:
            dashboard_data = self.db_manager.get_dashboard_data()
            
            # Add some simulation for demo
            active_jobs = dashboard_data['pending_jobs'] + random.randint(-2, 3)
            revenue = dashboard_data['revenue_this_month'] + random.randint(-1000, 2000)
            teams = dashboard_data['active_staff']
            clients = dashboard_data['active_clients'] + random.randint(-1, 2)
            
            self.kpi_widgets['jobs'].update_value(max(0, active_jobs))
            self.kpi_widgets['revenue'].update_value(f"${max(0, revenue):,.0f}")
            self.kpi_widgets['teams'].update_value(teams)
            self.kpi_widgets['clients'].update_value(max(0, clients))
            
        except Exception as e:
            print(f"KPI update error: {e}")

def main():
    # Initialize database with sample data if empty
    db = DatabaseManager()
    db.initialize_database()
    
    # Check if we need sample data
    jobs_count = db.fetch_one("SELECT COUNT(*) as count FROM jobs")
    if jobs_count and jobs_count['count'] == 0:
        print("Adding sample data...")
        
        # Add sample client
        db.execute("""
            INSERT INTO clients (name, contact_phone, address, city, state, zip_code)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("Acme Corporation", "555-0123", "123 Business Ave", "New York", "NY", "10001"))
        
        client_id = db.get_last_row_id()
        
        # Add sample jobs
        today = datetime.now()
        for i in range(5):
            job_date = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            db.execute("""
                INSERT INTO jobs (client_id, service_type, job_date, job_time, location, status, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (client_id, "Office Cleaning", job_date, "09:00", "123 Business Ave", "Scheduled", f"Daily cleaning service - Day {i+1}"))
        
        # Add sample employees
        db.execute("""
            INSERT INTO employees (name, position, contact_phone, status, pay_rate)
            VALUES (?, ?, ?, ?, ?)
        """, ("John Smith", "Team Leader", "555-0124", "Active", 25.00))
        
        db.execute("""
            INSERT INTO employees (name, position, contact_phone, status, pay_rate)
            VALUES (?, ?, ?, ?, ?)
        """, ("Jane Doe", "Cleaner", "555-0125", "Active", 20.00))
        
        print("Sample data added successfully!")
    
    # Launch application
    app = LiveOperationsCenter()
    app.mainloop()

if __name__ == "__main__":
    main()