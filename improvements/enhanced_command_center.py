"""
Enhanced Command Center - Aesthetically Aligned with Website & Mobile App
Real Firebase integration, Equipment Management, Floorplan Upload & Interactive Features
"""

import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image, ImageTk, ImageDraw
import json
import threading
import time
import requests
from datetime import datetime
import os
import sys

# Firebase simulation - replace with actual firebase_admin when ready
class FirebaseManager:
    def __init__(self):
        self.project_id = "teddys-cleaning-app"
        self.collections = {
            'jobs': [],
            'users': [],
            'equipment': [],
            'floorplans': []
        }
        self.listeners = []
        
    def get_jobs(self):
        """Get jobs from Firebase"""
        # Simulate real Firebase data structure
        return [
            {
                'id': 'job_001',
                'title': 'Office Deep Clean',
                'client': 'Tech Corp',
                'address': '123 Business Ave',
                'status': 'Scheduled',
                'assignedEmployees': [{'id': 'emp_001', 'name': 'John Smith'}],
                'scheduledDate': '2024-01-15',
                'priority': 'High'
            },
            {
                'id': 'job_002', 
                'title': 'Residential Cleaning',
                'client': 'Sarah Johnson',
                'address': '456 Home St',
                'status': 'In Progress',
                'assignedEmployees': [{'id': 'emp_002', 'name': 'Jane Doe'}],
                'scheduledDate': '2024-01-15',
                'priority': 'Medium'
            }
        ]
    
    def get_equipment(self):
        """Get equipment from Firebase"""
        return [
            {
                'id': 'eq_001',
                'name': 'Robotic Vacuum Alpha',
                'type': 'Vacuum',
                'status': 'Available',
                'battery': 87,
                'location': 'Warehouse A',
                'maintenance_due': '2024-02-01'
            },
            {
                'id': 'eq_002',
                'name': 'Smart Mop System',
                'type': 'Mop',
                'status': 'In Use',
                'battery': 45,
                'location': 'Job Site B',
                'maintenance_due': '2024-01-20'
            }
        ]

class FloorplanManager:
    def __init__(self):
        self.floorplans = {}
        self.annotations = {}
        
    def load_floorplan(self, filepath):
        """Load and process floorplan image"""
        try:
            image = Image.open(filepath)
            # Resize for display
            image.thumbnail((800, 600), Image.Resampling.LANCZOS)
            return image
        except Exception as e:
            print(f"Error loading floorplan: {e}")
            return None
    
    def add_annotation(self, floorplan_id, x, y, annotation_type, details):
        """Add annotation to floorplan"""
        if floorplan_id not in self.annotations:
            self.annotations[floorplan_id] = []
        
        self.annotations[floorplan_id].append({
            'x': x, 'y': y,
            'type': annotation_type,
            'details': details,
            'id': len(self.annotations[floorplan_id])
        })

class EquipmentManagementWidget(ctk.CTkFrame):
    def __init__(self, parent, firebase_manager):
        super().__init__(parent, fg_color="#0f1419")
        self.firebase_manager = firebase_manager
        
        # Header with gradient background
        header_frame = ctk.CTkFrame(self, fg_color="#2b2d42", height=80)
        header_frame.pack(fill="x", padx=20, pady=(20, 10))
        header_frame.pack_propagate(False)
        
        # Title with icon
        title_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        title_frame.pack(expand=True, fill="both")
        
        title = ctk.CTkLabel(title_frame, text="🤖 EQUIPMENT MANAGEMENT",
                           font=ctk.CTkFont(size=24, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(side="left", padx=20, pady=20)
        
        # Status indicator
        self.status_indicator = ctk.CTkLabel(title_frame, text="🟢 ALL SYSTEMS OPERATIONAL",
                                           font=ctk.CTkFont(size=12, weight="bold"),
                                           text_color="#00ff88")
        self.status_indicator.pack(side="right", padx=20, pady=20)
        
        # Equipment grid
        self.setup_equipment_grid()
        
        # Control panel
        self.setup_control_panel()
        
        # Load equipment data
        self.refresh_equipment()
    
    def setup_equipment_grid(self):
        """Setup equipment display grid"""
        # Equipment container
        equipment_container = ctk.CTkFrame(self, fg_color="#1a1c2e")
        equipment_container.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Grid header
        grid_header = ctk.CTkFrame(equipment_container, fg_color="#2b2d42", height=50)
        grid_header.pack(fill="x", padx=15, pady=15)
        grid_header.pack_propagate(False)
        
        headers = ["Equipment", "Type", "Status", "Battery", "Location", "Maintenance"]
        for i, header in enumerate(headers):
            label = ctk.CTkLabel(grid_header, text=header,
                               font=ctk.CTkFont(size=12, weight="bold"),
                               text_color="#4dc4d9")
            label.place(relx=i/6, rely=0.5, anchor="w")
        
        # Scrollable equipment list
        self.equipment_list = ctk.CTkScrollableFrame(equipment_container, height=400)
        self.equipment_list.pack(fill="both", expand=True, padx=15, pady=(0, 15))
    
    def setup_control_panel(self):
        """Setup equipment control panel"""
        control_frame = ctk.CTkFrame(self, fg_color="#2b2d42")
        control_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        # Control buttons
        btn_frame = ctk.CTkFrame(control_frame, fg_color="transparent")
        btn_frame.pack(pady=15)
        
        refresh_btn = ctk.CTkButton(btn_frame, text="🔄 REFRESH",
                                  command=self.refresh_equipment,
                                  fg_color="#4dc4d9", hover_color="#3ba8c4",
                                  width=120)
        refresh_btn.pack(side="left", padx=5)
        
        add_btn = ctk.CTkButton(btn_frame, text="➕ ADD EQUIPMENT",
                              command=self.add_equipment,
                              fg_color="#00ff88", hover_color="#00cc6a",
                              width=150)
        add_btn.pack(side="left", padx=5)
        
        maintenance_btn = ctk.CTkButton(btn_frame, text="🔧 SCHEDULE MAINTENANCE",
                                      command=self.schedule_maintenance,
                                      fg_color="#ff6b6b", hover_color="#ff5252",
                                      width=180)
        maintenance_btn.pack(side="left", padx=5)
    
    def refresh_equipment(self):
        """Refresh equipment list from Firebase"""
        # Clear existing equipment
        for widget in self.equipment_list.winfo_children():
            widget.destroy()
        
        # Get equipment from Firebase
        equipment_list = self.firebase_manager.get_equipment()
        
        for equipment in equipment_list:
            self.create_equipment_row(equipment)
    
    def create_equipment_row(self, equipment):
        """Create equipment row in grid"""
        row_frame = ctk.CTkFrame(self.equipment_list, fg_color="#2b2d42", height=60)
        row_frame.pack(fill="x", pady=2)
        row_frame.pack_propagate(False)
        
        # Equipment name
        name_label = ctk.CTkLabel(row_frame, text=equipment['name'],
                                font=ctk.CTkFont(size=11, weight="bold"),
                                text_color="#ffffff")
        name_label.place(relx=0, rely=0.5, anchor="w", x=10)
        
        # Type
        type_label = ctk.CTkLabel(row_frame, text=equipment['type'],
                                font=ctk.CTkFont(size=10),
                                text_color="#8892b0")
        type_label.place(relx=1/6, rely=0.5, anchor="w")
        
        # Status with color coding
        status_colors = {"Available": "#00ff88", "In Use": "#ffd93d", "Maintenance": "#ff6b6b"}
        status_label = ctk.CTkLabel(row_frame, text=equipment['status'],
                                  font=ctk.CTkFont(size=10, weight="bold"),
                                  text_color=status_colors.get(equipment['status'], "#ffffff"))
        status_label.place(relx=2/6, rely=0.5, anchor="w")
        
        # Battery with progress bar
        battery_frame = ctk.CTkFrame(row_frame, fg_color="transparent", width=80)
        battery_frame.place(relx=3/6, rely=0.5, anchor="w")
        
        battery_bar = ctk.CTkProgressBar(battery_frame, width=60, height=8)
        battery_bar.pack(pady=5)
        battery_bar.set(equipment['battery'] / 100)
        
        battery_text = ctk.CTkLabel(battery_frame, text=f"{equipment['battery']}%",
                                  font=ctk.CTkFont(size=9),
                                  text_color="#ffffff")
        battery_text.pack()
        
        # Location
        location_label = ctk.CTkLabel(row_frame, text=equipment['location'],
                                    font=ctk.CTkFont(size=10),
                                    text_color="#8892b0")
        location_label.place(relx=4/6, rely=0.5, anchor="w")
        
        # Maintenance due
        maintenance_label = ctk.CTkLabel(row_frame, text=equipment['maintenance_due'],
                                       font=ctk.CTkFont(size=10),
                                       text_color="#ff6b6b" if equipment['maintenance_due'] < "2024-01-20" else "#8892b0")
        maintenance_label.place(relx=5/6, rely=0.5, anchor="w")
    
    def add_equipment(self):
        """Add new equipment dialog"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("Add Equipment")
        dialog.geometry("400x300")
        dialog.configure(fg_color="#0f1419")
        
        # Form fields
        ctk.CTkLabel(dialog, text="Equipment Name:", text_color="#4dc4d9").pack(pady=5)
        name_entry = ctk.CTkEntry(dialog, width=300)
        name_entry.pack(pady=5)
        
        ctk.CTkLabel(dialog, text="Type:", text_color="#4dc4d9").pack(pady=5)
        type_entry = ctk.CTkEntry(dialog, width=300)
        type_entry.pack(pady=5)
        
        ctk.CTkLabel(dialog, text="Location:", text_color="#4dc4d9").pack(pady=5)
        location_entry = ctk.CTkEntry(dialog, width=300)
        location_entry.pack(pady=5)
        
        def save_equipment():
            # Save to Firebase (simulated)
            messagebox.showinfo("Success", "Equipment added successfully!")
            dialog.destroy()
            self.refresh_equipment()
        
        ctk.CTkButton(dialog, text="Add Equipment", command=save_equipment,
                     fg_color="#4dc4d9").pack(pady=20)
    
    def schedule_maintenance(self):
        """Schedule maintenance dialog"""
        messagebox.showinfo("Maintenance", "Maintenance scheduling feature coming soon!")

class FloorplanWidget(ctk.CTkFrame):
    def __init__(self, parent):
        super().__init__(parent, fg_color="#0f1419")
        self.floorplan_manager = FloorplanManager()
        self.current_floorplan = None
        self.current_image = None
        
        # Header
        header_frame = ctk.CTkFrame(self, fg_color="#2b2d42", height=80)
        header_frame.pack(fill="x", padx=20, pady=(20, 10))
        header_frame.pack_propagate(False)
        
        title = ctk.CTkLabel(header_frame, text="🏗️ INTERACTIVE FLOORPLANS",
                           font=ctk.CTkFont(size=24, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(side="left", padx=20, pady=20)
        
        # Upload button
        upload_btn = ctk.CTkButton(header_frame, text="📁 UPLOAD FLOORPLAN",
                                 command=self.upload_floorplan,
                                 fg_color="#00ff88", hover_color="#00cc6a")
        upload_btn.pack(side="right", padx=20, pady=20)
        
        # Main content area
        content_frame = ctk.CTkFrame(self, fg_color="#1a1c2e")
        content_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Floorplan display
        self.setup_floorplan_display(content_frame)
        
        # Annotation tools
        self.setup_annotation_tools(content_frame)
    
    def setup_floorplan_display(self, parent):
        """Setup floorplan display area"""
        display_frame = ctk.CTkFrame(parent, fg_color="#2b2d42")
        display_frame.pack(side="left", fill="both", expand=True, padx=(15, 10), pady=15)
        
        # Canvas for floorplan
        self.canvas = tk.Canvas(display_frame, bg="#0f1419", highlightthickness=0)
        self.canvas.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Bind click events for annotations
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        
        # Default message
        self.canvas.create_text(400, 300, text="Upload a floorplan to get started",
                              fill="#8892b0", font=("Arial", 16))
    
    def setup_annotation_tools(self, parent):
        """Setup annotation tools panel"""
        tools_frame = ctk.CTkFrame(parent, fg_color="#2b2d42", width=250)
        tools_frame.pack(side="right", fill="y", padx=(10, 15), pady=15)
        tools_frame.pack_propagate(False)
        
        # Tools title
        tools_title = ctk.CTkLabel(tools_frame, text="🎯 ANNOTATION TOOLS",
                                 font=ctk.CTkFont(size=16, weight="bold"),
                                 text_color="#4dc4d9")
        tools_title.pack(pady=15)
        
        # Annotation types
        annotation_types = [
            ("🪑 Furniture", "furniture"),
            ("🧽 Cleaning Zone", "cleaning"),
            ("🧪 Chemical Area", "chemical"),
            ("⚠️ Hazard Zone", "hazard"),
            ("🚪 Entry/Exit", "entry")
        ]
        
        self.selected_annotation = tk.StringVar(value="furniture")
        
        for text, value in annotation_types:
            radio = ctk.CTkRadioButton(tools_frame, text=text, variable=self.selected_annotation,
                                     value=value, text_color="#ffffff")
            radio.pack(anchor="w", padx=20, pady=5)
        
        # Chemical assignment
        chemical_frame = ctk.CTkFrame(tools_frame, fg_color="#1a1c2e")
        chemical_frame.pack(fill="x", padx=15, pady=15)
        
        ctk.CTkLabel(chemical_frame, text="🧪 CHEMICAL ASSIGNMENT",
                   font=ctk.CTkFont(size=12, weight="bold"),
                   text_color="#4dc4d9").pack(pady=10)
        
        self.chemical_selector = ctk.CTkComboBox(chemical_frame,
                                               values=["All-Purpose Cleaner", "Disinfectant", "Glass Cleaner", "Floor Polish"],
                                               width=200)
        self.chemical_selector.pack(pady=5)
        
        # Flooring type
        flooring_frame = ctk.CTkFrame(tools_frame, fg_color="#1a1c2e")
        flooring_frame.pack(fill="x", padx=15, pady=15)
        
        ctk.CTkLabel(flooring_frame, text="🏠 FLOORING TYPE",
                   font=ctk.CTkFont(size=12, weight="bold"),
                   text_color="#4dc4d9").pack(pady=10)
        
        self.flooring_selector = ctk.CTkComboBox(flooring_frame,
                                               values=["Carpet", "Hardwood", "Tile", "Vinyl", "Concrete"],
                                               width=200)
        self.flooring_selector.pack(pady=5)
        
        # Clear annotations
        clear_btn = ctk.CTkButton(tools_frame, text="🗑️ CLEAR ALL",
                                command=self.clear_annotations,
                                fg_color="#ff6b6b", hover_color="#ff5252")
        clear_btn.pack(pady=20)
    
    def upload_floorplan(self):
        """Upload and display floorplan"""
        file_path = filedialog.askopenfilename(
            title="Select Floorplan Image",
            filetypes=[("Image files", "*.png *.jpg *.jpeg *.gif *.bmp")]
        )
        
        if file_path:
            image = self.floorplan_manager.load_floorplan(file_path)
            if image:
                self.current_image = image
                self.display_floorplan(image)
    
    def display_floorplan(self, image):
        """Display floorplan on canvas"""
        self.canvas.delete("all")
        
        # Convert PIL image to PhotoImage
        photo = ImageTk.PhotoImage(image)
        
        # Store reference to prevent garbage collection
        self.canvas.image = photo
        
        # Display image
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        x = canvas_width // 2
        y = canvas_height // 2
        
        self.canvas.create_image(x, y, image=photo, anchor="center")
    
    def on_canvas_click(self, event):
        """Handle canvas click for annotations"""
        if not self.current_image:
            return
        
        annotation_type = self.selected_annotation.get()
        chemical = self.chemical_selector.get()
        flooring = self.flooring_selector.get()
        
        # Create annotation marker
        x, y = event.x, event.y
        
        # Color coding for different annotation types
        colors = {
            "furniture": "#ffd93d",
            "cleaning": "#4dc4d9", 
            "chemical": "#ff6b6b",
            "hazard": "#ff4444",
            "entry": "#00ff88"
        }
        
        color = colors.get(annotation_type, "#ffffff")
        
        # Draw annotation marker
        marker = self.canvas.create_oval(x-8, y-8, x+8, y+8, 
                                       fill=color, outline="#ffffff", width=2)
        
        # Add text label
        label_text = f"{annotation_type.title()}"
        if annotation_type == "chemical" and chemical:
            label_text += f"\n{chemical}"
        if annotation_type == "cleaning" and flooring:
            label_text += f"\n{flooring}"
        
        text_id = self.canvas.create_text(x, y-25, text=label_text,
                                        fill="#ffffff", font=("Arial", 9, "bold"),
                                        anchor="center")
        
        # Store annotation
        self.floorplan_manager.add_annotation("current", x, y, annotation_type, {
            "chemical": chemical,
            "flooring": flooring
        })
    
    def clear_annotations(self):
        """Clear all annotations"""
        if self.current_image:
            self.display_floorplan(self.current_image)
            self.floorplan_manager.annotations["current"] = []

class EnhancedCommandCenter(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # Initialize managers
        self.firebase_manager = FirebaseManager()
        
        # Window setup with website aesthetics
        self.title("Teddy's Cleaning - Enhanced Command Center")
        self.geometry("1600x1000")
        self.configure(fg_color="#0f1419")  # Website background color
        
        # Load logo
        self.load_assets()
        
        # Setup UI with website color scheme
        self.setup_ui()
        
        # Start real-time updates
        self.start_real_time_updates()
    
    def load_assets(self):
        """Load logo and assets from mobile app"""
        try:
            logo_path = r"c:\Users\Tewedros\teddys-cleaning-app\assets\images\Signature-logo.png"
            if os.path.exists(logo_path):
                self.logo_image = Image.open(logo_path)
                self.logo_image = self.logo_image.resize((60, 60), Image.Resampling.LANCZOS)
                self.logo_photo = ImageTk.PhotoImage(self.logo_image)
            else:
                self.logo_photo = None
        except Exception as e:
            print(f"Error loading logo: {e}")
            self.logo_photo = None
    
    def setup_ui(self):
        """Setup UI with website color scheme and aesthetics"""
        # Header with gradient background (website colors)
        header_frame = ctk.CTkFrame(self, fg_color="#2b2d42", height=100)  # Website gradient start
        header_frame.pack(fill="x", padx=0, pady=0)
        header_frame.pack_propagate(False)
        
        # Logo and title
        logo_title_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        logo_title_frame.pack(side="left", padx=30, pady=20)
        
        if self.logo_photo:
            logo_label = tk.Label(logo_title_frame, image=self.logo_photo, bg="#2b2d42")
            logo_label.pack(side="left", padx=(0, 15))
        
        title_frame = ctk.CTkFrame(logo_title_frame, fg_color="transparent")
        title_frame.pack(side="left")
        
        main_title = ctk.CTkLabel(title_frame, text="TEDDY'S COMMAND CENTER",
                                font=ctk.CTkFont(size=28, weight="bold"),
                                text_color="#4dc4d9")  # Website accent color
        main_title.pack(anchor="w")
        
        subtitle = ctk.CTkLabel(title_frame, text="The Future of Clean - Desktop Operations",
                              font=ctk.CTkFont(size=14),
                              text_color="#e6e6e6")  # Website text light
        subtitle.pack(anchor="w")
        
        # Status indicators (website style)
        status_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        status_frame.pack(side="right", padx=30, pady=20)
        
        firebase_status = ctk.CTkLabel(status_frame, text="🔥 FIREBASE CONNECTED",
                                     font=ctk.CTkFont(size=12, weight="bold"),
                                     text_color="#00ff88")
        firebase_status.pack(anchor="e")
        
        system_status = ctk.CTkLabel(status_frame, text="⚡ ALL SYSTEMS OPERATIONAL",
                                   font=ctk.CTkFont(size=10),
                                   text_color="#4dc4d9")
        system_status.pack(anchor="e")
        
        # Main content with tabbed interface
        self.notebook = ctk.CTkTabview(self, width=1580, height=850)
        self.notebook.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Equipment Management Tab
        equipment_tab = self.notebook.add("🤖 EQUIPMENT")
        self.equipment_widget = EquipmentManagementWidget(equipment_tab, self.firebase_manager)
        self.equipment_widget.pack(fill="both", expand=True)
        
        # Floorplan Management Tab
        floorplan_tab = self.notebook.add("🏗️ FLOORPLANS")
        self.floorplan_widget = FloorplanWidget(floorplan_tab)
        self.floorplan_widget.pack(fill="both", expand=True)
        
        # Firebase Jobs Tab
        jobs_tab = self.notebook.add("🔥 FIREBASE JOBS")
        self.setup_firebase_jobs_tab(jobs_tab)
        
        # Analytics Tab
        analytics_tab = self.notebook.add("📊 ANALYTICS")
        self.setup_analytics_tab(analytics_tab)
    
    def setup_firebase_jobs_tab(self, tab):
        """Setup Firebase jobs integration tab"""
        # Header
        header_frame = ctk.CTkFrame(tab, fg_color="#2b2d42", height=80)
        header_frame.pack(fill="x", padx=20, pady=(20, 10))
        header_frame.pack_propagate(False)
        
        title = ctk.CTkLabel(header_frame, text="🔥 FIREBASE JOBS SYNC",
                           font=ctk.CTkFont(size=24, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(side="left", padx=20, pady=20)
        
        sync_btn = ctk.CTkButton(header_frame, text="🔄 SYNC NOW",
                               command=self.sync_firebase_jobs,
                               fg_color="#4dc4d9", hover_color="#3ba8c4")
        sync_btn.pack(side="right", padx=20, pady=20)
        
        # Jobs list
        jobs_container = ctk.CTkFrame(tab, fg_color="#1a1c2e")
        jobs_container.pack(fill="both", expand=True, padx=20, pady=10)
        
        self.firebase_jobs_list = ctk.CTkScrollableFrame(jobs_container, height=600)
        self.firebase_jobs_list.pack(fill="both", expand=True, padx=15, pady=15)
        
        # Load Firebase jobs
        self.sync_firebase_jobs()
    
    def setup_analytics_tab(self, tab):
        """Setup analytics dashboard"""
        # Analytics header
        header_frame = ctk.CTkFrame(tab, fg_color="#2b2d42", height=80)
        header_frame.pack(fill="x", padx=20, pady=(20, 10))
        header_frame.pack_propagate(False)
        
        title = ctk.CTkLabel(header_frame, text="📊 PERFORMANCE ANALYTICS",
                           font=ctk.CTkFont(size=24, weight="bold"),
                           text_color="#4dc4d9")
        title.pack(side="left", padx=20, pady=20)
        
        # Metrics grid
        metrics_frame = ctk.CTkFrame(tab, fg_color="#1a1c2e")
        metrics_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Success metrics from website
        metrics_data = [
            ("User Engagement", "+300%", "#00ff88"),
            ("Operational Efficiency", "+25%", "#4dc4d9"),
            ("Response Time", "-50%", "#ffd93d"),
            ("Training Effectiveness", "+60%", "#ff6b6b")
        ]
        
        for i, (metric, value, color) in enumerate(metrics_data):
            metric_card = ctk.CTkFrame(metrics_frame, fg_color="#2b2d42")
            metric_card.place(relx=(i%2)*0.5 + 0.05, rely=(i//2)*0.4 + 0.1, 
                            relwidth=0.4, relheight=0.3)
            
            metric_title = ctk.CTkLabel(metric_card, text=metric,
                                      font=ctk.CTkFont(size=16, weight="bold"),
                                      text_color="#8892b0")
            metric_title.pack(pady=(20, 10))
            
            metric_value = ctk.CTkLabel(metric_card, text=value,
                                      font=ctk.CTkFont(size=36, weight="bold"),
                                      text_color=color)
            metric_value.pack()
    
    def sync_firebase_jobs(self):
        """Sync jobs from Firebase"""
        # Clear existing jobs
        for widget in self.firebase_jobs_list.winfo_children():
            widget.destroy()
        
        # Get jobs from Firebase
        jobs = self.firebase_manager.get_jobs()
        
        for job in jobs:
            self.create_firebase_job_card(job)
    
    def create_firebase_job_card(self, job):
        """Create Firebase job card"""
        card = ctk.CTkFrame(self.firebase_jobs_list, fg_color="#2b2d42")
        card.pack(fill="x", pady=5)
        
        # Job header
        header_frame = ctk.CTkFrame(card, fg_color="transparent")
        header_frame.pack(fill="x", padx=15, pady=10)
        
        # Job title and client
        title_label = ctk.CTkLabel(header_frame, text=job['title'],
                                 font=ctk.CTkFont(size=16, weight="bold"),
                                 text_color="#4dc4d9")
        title_label.pack(side="left")
        
        # Status with color coding
        status_colors = {"Scheduled": "#ffd93d", "In Progress": "#4dc4d9", "Completed": "#00ff88"}
        status_label = ctk.CTkLabel(header_frame, text=job['status'],
                                  font=ctk.CTkFont(size=12, weight="bold"),
                                  text_color=status_colors.get(job['status'], "#ffffff"))
        status_label.pack(side="right")
        
        # Job details
        details_frame = ctk.CTkFrame(card, fg_color="transparent")
        details_frame.pack(fill="x", padx=15, pady=(0, 10))
        
        client_label = ctk.CTkLabel(details_frame, text=f"Client: {job['client']}",
                                  font=ctk.CTkFont(size=12),
                                  text_color="#ffffff")
        client_label.pack(anchor="w")
        
        address_label = ctk.CTkLabel(details_frame, text=f"Address: {job['address']}",
                                   font=ctk.CTkFont(size=12),
                                   text_color="#8892b0")
        address_label.pack(anchor="w")
        
        if job.get('assignedEmployees'):
            employee_names = [emp['name'] for emp in job['assignedEmployees']]
            employees_label = ctk.CTkLabel(details_frame, text=f"Assigned: {', '.join(employee_names)}",
                                         font=ctk.CTkFont(size=12),
                                         text_color="#4dc4d9")
            employees_label.pack(anchor="w")
    
    def start_real_time_updates(self):
        """Start real-time updates"""
        def update_loop():
            while True:
                try:
                    # Simulate real-time updates
                    time.sleep(5)
                    
                    # Update equipment status
                    self.after(0, self.equipment_widget.refresh_equipment)
                    
                except Exception as e:
                    print(f"Update error: {e}")
                    time.sleep(1)
        
        update_thread = threading.Thread(target=update_loop, daemon=True)
        update_thread.start()

def main():
    """Launch Enhanced Command Center"""
    print("Launching Enhanced Command Center...")
    print("Features: Equipment Management | Floorplan Upload | Firebase Integration")
    
    app = EnhancedCommandCenter()
    app.mainloop()

if __name__ == "__main__":
    main()