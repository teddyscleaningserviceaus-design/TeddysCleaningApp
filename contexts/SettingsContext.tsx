import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface SettingsContextType {
  settings: {
    notifications: boolean;
    darkMode: boolean;
    autoClockOut: boolean;
    sliderAutoplay: boolean;
    language: string;
    clockOutTime: number;
  };
  updateSetting: (key: string, value: any) => Promise<void>;
  loading: boolean;
}

const defaultSettings = {
  notifications: true,
  darkMode: false,
  autoClockOut: false,
  sliderAutoplay: true,
  language: 'English',
  clockOutTime: 8,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (auth.currentUser) {
      try {
        const settingsDoc = await getDoc(doc(db, 'userSettings', auth.currentUser.uid));
        if (settingsDoc.exists()) {
          setSettings({ ...defaultSettings, ...settingsDoc.data() });
        }
      } catch (error) {
        console.log('Error loading settings:', error);
      }
    }
    setLoading(false);
  };

  const updateSetting = async (key: string, value: any) => {
    if (!auth.currentUser) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), newSettings, { merge: true });
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};