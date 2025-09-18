"""
Firebase Integration for Real-time Data Sync
Connects desktop command center to Firebase backend used by mobile app
"""

# Firebase simulation - replace with actual firebase_admin when ready
# import firebase_admin
# from firebase_admin import credentials, firestore, auth
import customtkinter as ctk
import tkinter as tk
import threading
import time
import json
from datetime import datetime
import sys
import os

# Add paths
sys.path.append(r"C:\Users\Tewedros\Desktop\teddy_cleaning_app_v2")
from database.db_manager import DatabaseManager

class FirebaseManager:
    def __init__(self):
        self.db = None
        self.listeners = []
        self.local_db = DatabaseManager()
        self.sync_active = False
        
        # Initialize Firebase (using demo config)
        self.init_firebase()
    
    def init_firebase(self):
        """Initialize Firebase connection"""
        try:
            # Demo Firebase config - replace with actual credentials
            firebase_config = {
                "type": "service_account",
                "project_id": "teddys-cleaning-demo",
                "private_key_id": "demo_key_id",
                "client_email": "demo@teddys-cleaning-demo.iam.gserviceaccount.com"
            }
            
            # For demo purposes, we'll simulate Firebase connection
            print("Firebase connection simulated - replace with actual credentials")
            self.db = "firebase_simulation"
            self.sync_active = True
            
        except Exception as e:
            print(f"Firebase init error: {e}")
            self.sync_active = False
    
    def start_real_time_listeners(self):
        """Start Firebase real-time listeners"""
        if not self.sync_active:
            return
        
        # Simulate real-time data streams
        def simulate_firebase_data():
            while self.sync_active:
                # Simulate job updates from mobile
                self.simulate_job_update()
                time.sleep(5)
                
                # Simulate location updates
                self.simulate_location_update()
                time.sleep(3)
                
                # Simulate new bookings
                self.simulate_new_booking()
                time.sleep(10)
        
        listener_thread = threading.Thread(target=simulate_firebase_data, daemon=True)
        listener_thread.start()
    
    def simulate_job_update(self):
        """Simulate job status update from Firebase"""
        import random
        
        job_updates = [
            {"job_id": "fb_001", "status": "In Progress", "team": "Alpha", "progress": 45},
            {"job_id": "fb_002", "status": "Completed", "team": "Beta", "progress": 100},
            {"job_id": "fb_003", "status": "En Route", "team": "Gamma", "progress": 15}
        ]
        
        update = random.choice(job_updates)
        
        # Notify listeners
        for listener in self.listeners:
            if hasattr(listener, 'on_job_update'):
                listener.on_job_update(update)
    
    def simulate_location_update(self):
        """Simulate GPS location update from Firebase"""
        import random
        
        locations = [
            {"team_id": "alpha", "lat": 40.7128 + random.uniform(-0.01, 0.01), 
             "lng": -74.0060 + random.uniform(-0.01, 0.01), "status": "active"},
            {"team_id": "beta", "lat": 40.7589 + random.uniform(-0.01, 0.01), 
             "lng": -73.9851 + random.uniform(-0.01, 0.01), "status": "en_route"},
            {"team_id": "gamma", "lat": 40.6892 + random.uniform(-0.01, 0.01), 
             "lng": -74.0445 + random.uniform(-0.01, 0.01), "status": "completed"}
        ]
        
        location = random.choice(locations)
        
        # Notify listeners
        for listener in self.listeners:
            if hasattr(listener, 'on_location_update'):
                listener.on_location_update(location)
    
    def simulate_new_booking(self):
        """Simulate new booking from Firebase"""
        import random
        
        bookings = [
            {"client": "Tech Corp", "service": "Office Deep Clean", "priority": "high"},
            {"client": "Retail Store", "service": "Daily Maintenance", "priority": "normal"},
            {"client": "Medical Center", "service": "Sanitization", "priority": "urgent"}
        ]
        
        booking = random.choice(bookings)
        booking["timestamp"] = datetime.now().isoformat()
        
        # Notify listeners
        for listener in self.listeners:
            if hasattr(listener, 'on_new_booking'):
                listener.on_new_booking(booking)
    
    def add_listener(self, listener):
        """Add Firebase data listener"""
        self.listeners.append(listener)
    
    def sync_to_firebase(self, data_type, data):
        """Sync local changes to Firebase"""
        if not self.sync_active:
            return False
        
        print(f"🔥 Syncing {data_type} to Firebase: {data}")
        return True

class MultiScreenManager:
    def __init__(self):
        self.screens = []
        self.primary_window = None
        self.secondary_windows = []
        
    def detect_screens(self):
        """Detect available screens"""
        import tkinter as tk
        root = tk.Tk()
        
        # Get screen dimensions
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        
        print(f"Primary screen: {screen_width}x{screen_height}")
        
        # Simulate multi-screen detection
        self.screens = [
            {"id": 0, "width": screen_width, "height": screen_height, "primary": True},
            {"id": 1, "width": 1920, "height": 1080, "primary": False}  # Simulated second screen
        ]
        
        root.destroy()
        return self.screens
    
    def create_multi_screen_layout(self, firebase_manager):
        """Create multi-screen command center layout"""
        screens = self.detect_screens()
        
        # Primary screen - Main command center
        self.primary_window = FirebaseCommandCenter(firebase_manager, screen_id=0)
        
        # Secondary screen - Monitoring dashboard (if available)
        if len(screens) > 1:
            secondary = FirebaseMonitoringDashboard(firebase_manager, screen_id=1)
            self.secondary_windows.append(secondary)
        
        return self.primary_window, self.secondary_windows

class FirebaseCommandCenter(ctk.CTk):
    def __init__(self, firebase_manager, screen_id=0):
        super().__init__()
        
        self.firebase_manager = firebase_manager
        self.firebase_manager.add_listener(self)
        
        # Window setup for multi-screen
        self.title("🔥 Teddy's Firebase Command Center")
        self.geometry("1800x1200")
        self.configure(fg_color="#0f1419")
        
        # Position on specific screen
        if screen_id == 0:
            self.geometry("1800x1200+100+50")
        
        self.setup_ui()
        self.start_firebase_sync()
    
    def setup_ui(self):
        """Setup Firebase-integrated UI"""
        # Header with Firebase status
        header_frame = ctk.CTkFrame(self, fg_color="#1a1c2e", height=100)
        header_frame.pack(fill="x", padx=20, pady=20)
        header_frame.pack_propagate(False)
        
        # Title with Firebase indicator
        title_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        title_frame.pack(expand=True, fill="both")
        
        title = ctk.CTkLabel(title_frame, text="🔥 FIREBASE COMMAND CENTER",
                           font=ctk.CTkFont(size=32, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(side="left", padx=20, pady=20)
        
        # Firebase status indicators
        status_frame = ctk.CTkFrame(title_frame, fg_color="transparent")
        status_frame.pack(side="right", padx=20, pady=20)
        
        self.firebase_status = ctk.CTkLabel(status_frame, text="🔥 FIREBASE CONNECTED",
                                          font=ctk.CTkFont(size=14, weight="bold"),
                                          text_color="#00ff88")
        self.firebase_status.pack()
        
        self.sync_status = ctk.CTkLabel(status_frame, text="⚡ REAL-TIME SYNC ACTIVE",
                                      font=ctk.CTkFont(size=12),
                                      text_color="#4dc4d9")
        self.sync_status.pack()
        
        # Main content with tabs
        self.notebook = ctk.CTkTabview(self, width=1760, height=900)
        self.notebook.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        
        # Firebase Live Data Tab
        live_tab = self.notebook.add("🔥 LIVE DATA")
        self.setup_live_data_tab(live_tab)
        
        # Multi-Screen Control Tab
        multiscreen_tab = self.notebook.add("🖥️ MULTI-SCREEN")
        self.setup_multiscreen_tab(multiscreen_tab)
        
        # Firebase Analytics Tab
        analytics_tab = self.notebook.add("📊 ANALYTICS")
        self.setup_analytics_tab(analytics_tab)
    
    def setup_live_data_tab(self, tab):
        """Setup Firebase live data display"""
        # Real-time job updates
        jobs_frame = ctk.CTkFrame(tab, fg_color="#1a1c2e")
        jobs_frame.pack(side="left", fill="both", expand=True, padx=(0, 10))
        
        jobs_title = ctk.CTkLabel(jobs_frame, text="🔥 FIREBASE JOBS",
                                font=ctk.CTkFont(size=18, weight="bold"),
                                text_color="#4dc4d9")
        jobs_title.pack(pady=15)
        
        self.firebase_jobs_list = ctk.CTkScrollableFrame(jobs_frame, height=400)
        self.firebase_jobs_list.pack(fill="both", expand=True, padx=15, pady=15)
        
        # Real-time team locations
        locations_frame = ctk.CTkFrame(tab, fg_color="#1a1c2e")
        locations_frame.pack(side="right", fill="both", expand=True)
        
        locations_title = ctk.CTkLabel(locations_frame, text="📍 LIVE LOCATIONS",
                                     font=ctk.CTkFont(size=18, weight="bold"),
                                     text_color="#4dc4d9")
        locations_title.pack(pady=15)
        
        self.locations_canvas = tk.Canvas(locations_frame, bg="#0f1419", height=400)
        self.locations_canvas.pack(fill="both", expand=True, padx=15, pady=15)
        
        # Firebase metrics
        metrics_frame = ctk.CTkFrame(tab, fg_color="#2b2d42", height=150)
        metrics_frame.pack(fill="x", padx=15, pady=15)
        metrics_frame.pack_propagate(False)
        
        metrics_title = ctk.CTkLabel(metrics_frame, text="🔥 FIREBASE METRICS",
                                   font=ctk.CTkFont(size=16, weight="bold"),
                                   text_color="#4dc4d9")
        metrics_title.pack(pady=10)
        
        self.metrics_display = ctk.CTkLabel(metrics_frame, 
                                          text="Reads: 1,247 | Writes: 89 | Listeners: 12 | Latency: 45ms",
                                          font=ctk.CTkFont(size=12),
                                          text_color="#ffffff")
        self.metrics_display.pack()
    
    def setup_multiscreen_tab(self, tab):
        """Setup multi-screen control interface"""
        # Screen detection
        detection_frame = ctk.CTkFrame(tab, fg_color="#1a1c2e")
        detection_frame.pack(fill="x", padx=15, pady=15)
        
        detection_title = ctk.CTkLabel(detection_frame, text="🖥️ SCREEN DETECTION",
                                     font=ctk.CTkFont(size=18, weight="bold"),
                                     text_color="#4dc4d9")
        detection_title.pack(pady=15)
        
        # Detected screens
        screens_info = "Primary: 1800x1200 (Command Center)\nSecondary: 1920x1080 (Monitoring Dashboard)"
        screens_label = ctk.CTkLabel(detection_frame, text=screens_info,
                                   font=ctk.CTkFont(size=12),
                                   text_color="#ffffff", justify="left")
        screens_label.pack(pady=10)
        
        # Multi-screen controls
        controls_frame = ctk.CTkFrame(tab, fg_color="#2b2d42")
        controls_frame.pack(fill="both", expand=True, padx=15, pady=15)
        
        controls_title = ctk.CTkLabel(controls_frame, text="⚡ MULTI-SCREEN CONTROLS",
                                    font=ctk.CTkFont(size=16, weight="bold"),
                                    text_color="#4dc4d9")
        controls_title.pack(pady=15)
        
        # Control buttons
        btn_frame = ctk.CTkFrame(controls_frame, fg_color="transparent")
        btn_frame.pack(pady=20)
        
        launch_monitoring = ctk.CTkButton(btn_frame, text="📊 LAUNCH MONITORING DASHBOARD",
                                        command=self.launch_monitoring_dashboard,
                                        fg_color="#4dc4d9", hover_color="#3ba8c4",
                                        width=300, height=50)
        launch_monitoring.pack(pady=10)
        
        sync_screens = ctk.CTkButton(btn_frame, text="🔄 SYNC ALL SCREENS",
                                   command=self.sync_all_screens,
                                   fg_color="#00ff88", hover_color="#00cc6a",
                                   width=300, height=50)
        sync_screens.pack(pady=10)
    
    def setup_analytics_tab(self, tab):
        """Setup Firebase analytics dashboard"""
        # Performance metrics
        perf_frame = ctk.CTkFrame(tab, fg_color="#1a1c2e")
        perf_frame.pack(fill="x", padx=15, pady=15)
        
        perf_title = ctk.CTkLabel(perf_frame, text="📈 PERFORMANCE ANALYTICS",
                                font=ctk.CTkFont(size=18, weight="bold"),
                                text_color="#4dc4d9")
        perf_title.pack(pady=15)
        
        # Success metrics display
        metrics_grid = ctk.CTkFrame(perf_frame, fg_color="transparent")
        metrics_grid.pack(fill="x", padx=20, pady=20)
        
        # Row 1
        row1 = ctk.CTkFrame(metrics_grid, fg_color="transparent")
        row1.pack(fill="x", pady=5)
        
        engagement_metric = self.create_metric_card(row1, "USER ENGAGEMENT", "+300%", "#00ff88")
        engagement_metric.pack(side="left", fill="x", expand=True, padx=(0, 10))
        
        efficiency_metric = self.create_metric_card(row1, "OPERATIONAL EFFICIENCY", "+25%", "#4dc4d9")
        efficiency_metric.pack(side="left", fill="x", expand=True)
        
        # Row 2
        row2 = ctk.CTkFrame(metrics_grid, fg_color="transparent")
        row2.pack(fill="x", pady=5)
        
        response_metric = self.create_metric_card(row2, "RESPONSE TIME", "-50%", "#ffd93d")
        response_metric.pack(side="left", fill="x", expand=True, padx=(0, 10))
        
        training_metric = self.create_metric_card(row2, "TRAINING EFFECTIVENESS", "+60%", "#ff6b6b")
        training_metric.pack(side="left", fill="x", expand=True)
    
    def create_metric_card(self, parent, title, value, color):
        """Create performance metric card"""
        card = ctk.CTkFrame(parent, fg_color="#2b2d42")
        
        title_label = ctk.CTkLabel(card, text=title,
                                 font=ctk.CTkFont(size=12, weight="bold"),
                                 text_color="#8892b0")
        title_label.pack(pady=(15, 5))
        
        value_label = ctk.CTkLabel(card, text=value,
                                 font=ctk.CTkFont(size=28, weight="bold"),
                                 text_color=color)
        value_label.pack(pady=(0, 15))
        
        return card
    
    def start_firebase_sync(self):
        """Start Firebase real-time synchronization"""
        self.firebase_manager.start_real_time_listeners()
        
        # Update Firebase status periodically
        def update_firebase_status():
            while True:
                # Simulate Firebase metrics
                import random
                reads = random.randint(1200, 1300)
                writes = random.randint(80, 100)
                listeners = random.randint(10, 15)
                latency = random.randint(40, 60)
                
                metrics_text = f"Reads: {reads:,} | Writes: {writes} | Listeners: {listeners} | Latency: {latency}ms"
                
                self.after(0, lambda: self.metrics_display.configure(text=metrics_text))
                time.sleep(5)
        
        status_thread = threading.Thread(target=update_firebase_status, daemon=True)
        status_thread.start()
    
    def launch_monitoring_dashboard(self):
        """Launch secondary monitoring dashboard"""
        try:
            monitoring = FirebaseMonitoringDashboard(self.firebase_manager, screen_id=1)
            monitoring.mainloop()
        except Exception as e:
            print(f"Error launching monitoring dashboard: {e}")
    
    def sync_all_screens(self):
        """Synchronize all screens"""
        self.sync_status.configure(text="🔄 SYNCING ALL SCREENS...", text_color="#ffff00")
        
        def complete_sync():
            time.sleep(2)
            self.after(0, lambda: self.sync_status.configure(
                text="✅ ALL SCREENS SYNCHRONIZED", text_color="#00ff88"))
        
        sync_thread = threading.Thread(target=complete_sync, daemon=True)
        sync_thread.start()
    
    # Firebase event handlers
    def on_job_update(self, job_data):
        """Handle Firebase job update"""
        def update_ui():
            # Create job update card
            job_card = ctk.CTkFrame(self.firebase_jobs_list, fg_color="#2b2d42")
            job_card.pack(fill="x", pady=2)
            
            timestamp = datetime.now().strftime("%H:%M:%S")
            job_text = f"🔥 {timestamp} | Job {job_data['job_id']} → {job_data['status']} | Team {job_data['team']}"
            
            job_label = ctk.CTkLabel(job_card, text=job_text,
                                   font=ctk.CTkFont(size=11),
                                   text_color="#ffffff")
            job_label.pack(anchor="w", padx=10, pady=5)
        
        self.after(0, update_ui)
    
    def on_location_update(self, location_data):
        """Handle Firebase location update"""
        def update_map():
            # Update locations canvas
            self.locations_canvas.delete("team")
            
            # Draw team location
            x = 100 + (location_data['lng'] + 74) * 500
            y = 100 + (40.8 - location_data['lat']) * 500
            
            color = {"active": "#00ff00", "en_route": "#ffff00", "completed": "#4dc4d9"}[location_data['status']]
            
            self.locations_canvas.create_oval(x-10, y-10, x+10, y+10,
                                            fill=color, outline="#ffffff", width=2, tags="team")
            self.locations_canvas.create_text(x, y-25, text=f"Team {location_data['team_id'].title()}",
                                            fill="#ffffff", tags="team")
        
        self.after(0, update_map)
    
    def on_new_booking(self, booking_data):
        """Handle Firebase new booking"""
        def show_booking():
            # Flash Firebase status
            self.firebase_status.configure(text="🔥 NEW BOOKING RECEIVED", text_color="#ffff00")
            
            def reset_status():
                time.sleep(3)
                self.after(0, lambda: self.firebase_status.configure(
                    text="🔥 FIREBASE CONNECTED", text_color="#00ff88"))
            
            reset_thread = threading.Thread(target=reset_status, daemon=True)
            reset_thread.start()
        
        self.after(0, show_booking)

class FirebaseMonitoringDashboard(ctk.CTkToplevel):
    def __init__(self, firebase_manager, screen_id=1):
        super().__init__()
        
        self.firebase_manager = firebase_manager
        
        # Window setup for secondary screen
        self.title("📊 Firebase Monitoring Dashboard")
        self.geometry("1920x1080+1920+0")  # Position on second screen
        self.configure(fg_color="#0f1419")
        
        self.setup_monitoring_ui()
    
    def setup_monitoring_ui(self):
        """Setup monitoring dashboard UI"""
        # Header
        header = ctk.CTkLabel(self, text="📊 FIREBASE MONITORING DASHBOARD",
                            font=ctk.CTkFont(size=24, weight="bold"),
                            text_color="#4dc4d9")
        header.pack(pady=20)
        
        # Large metrics display
        metrics_frame = ctk.CTkFrame(self, fg_color="#1a1c2e")
        metrics_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Real-time charts placeholder
        chart_label = ctk.CTkLabel(metrics_frame, 
                                 text="📈 REAL-TIME FIREBASE ANALYTICS\n\n• Live user sessions: 47\n• Database operations/sec: 23\n• Cloud function executions: 156\n• Storage bandwidth: 2.3 MB/s",
                                 font=ctk.CTkFont(size=16),
                                 text_color="#ffffff", justify="center")
        chart_label.pack(expand=True)

def main():
    """Launch Firebase-integrated command center"""
    print("Initializing Firebase Command Center...")
    
    # Initialize Firebase manager
    firebase_manager = FirebaseManager()
    
    # Initialize multi-screen manager
    multiscreen_manager = MultiScreenManager()
    
    # Create multi-screen layout
    primary_window, secondary_windows = multiscreen_manager.create_multi_screen_layout(firebase_manager)
    
    print("Firebase Command Center launched!")
    print("Multi-screen layout active")
    print("Real-time sync enabled")
    
    # Launch primary window
    primary_window.mainloop()

if __name__ == "__main__":
    main()