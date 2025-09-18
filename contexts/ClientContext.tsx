import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface ClientData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  fullAddress?: string;
  propertyType?: string;
  cleaningFrequency?: string;
  specialRequests?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  createdAt?: any;
  totalBookings?: number;
  completedBookings?: number;
  co2Saved?: number;
  onboardingCompleted?: boolean;
}

interface ClientContextType {
  clientData: ClientData;
  refreshClientData: () => void;
  loading: boolean;
  cleanup?: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [clientData, setClientData] = useState<ClientData>({});
  const [loading, setLoading] = useState(true);
  const [unsubscribes, setUnsubscribes] = useState<(() => void)[]>([]);

  const calculateCO2Saved = (completedBookings: number) => {
    // Each cleaning service saves approximately 2.5kg CO2 through eco-friendly products
    return Math.round(completedBookings * 2.5);
  };

  const loadClientData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        console.log('Loading client data for user:', user.uid);
        
        // Load client profile
        const clientDoc = await getDoc(doc(db, 'clients', user.uid));
        if (clientDoc.exists()) {
          const data = clientDoc.data() as ClientData;
          console.log('Client document found:', data);
          
          // Load job statistics
          const jobsQuery = query(
            collection(db, 'jobs'),
            where('clientId', '==', user.uid)
          );
          
          const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
            const jobs = snapshot.docs.map(doc => doc.data());
            const totalBookings = jobs.length;
            const completedBookings = jobs.filter(job => job.status === 'Completed').length;
            const co2Saved = calculateCO2Saved(completedBookings);
            
            console.log('Jobs loaded:', { totalBookings, completedBookings });
            
            // Ensure we have all the onboarding data
            setClientData({
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              email: data.email || user.email || '',
              phone: data.phone || '',
              address: data.address || '',
              fullAddress: data.fullAddress || '',
              suburb: data.suburb || '',
              postcode: data.postcode || '',
              state: data.state || '',
              propertyType: data.propertyType || '',
              cleaningFrequency: data.cleaningFrequency || '',
              specialRequests: data.specialRequests || '',
              emergencyContact: data.emergencyContact || '',
              emergencyPhone: data.emergencyPhone || '',
              createdAt: data.createdAt,
              onboardingCompleted: data.onboardingCompleted,
              totalBookings,
              completedBookings,
              co2Saved
            });
            setLoading(false);
          });
          
          setUnsubscribes(prev => [...prev, unsubscribe]);
          return unsubscribe;
        } else {
          console.log('No client document found, creating default data');
          // Client document doesn't exist, create default data
          setClientData({
            email: user.email || '',
            totalBookings: 0,
            completedBookings: 0,
            co2Saved: 0
          });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading client data:', error);
      setClientData({
        totalBookings: 0,
        completedBookings: 0,
        co2Saved: 0
      });
      setLoading(false);
    }
  };

  const refreshClientData = () => {
    loadClientData();
  };

  const cleanup = () => {
    unsubscribes.forEach(unsub => {
      try {
        unsub();
      } catch (error) {
        console.log('Error cleaning up listener:', error);
      }
    });
    setUnsubscribes([]);
  };

  useEffect(() => {
    const unsubscribe = loadClientData();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return (
    <ClientContext.Provider value={{ clientData: clientData || {}, refreshClientData, loading, cleanup }}>
      {children}
    </ClientContext.Provider>
  );
};