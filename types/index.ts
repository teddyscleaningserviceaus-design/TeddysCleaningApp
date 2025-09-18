export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'employee' | 'client';
  phone?: string;
  createdAt: Date;
}

export interface Job {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  assignedCleaners: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  serviceType: string;
  priority: 'low' | 'medium' | 'high';
  price?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface GuestBooking {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  preferredDate: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  isGuest: true;
  createdAt: Date;
}