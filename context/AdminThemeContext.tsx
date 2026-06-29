import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AdminThemeContextType = {
  accentColor: string;
  changeAccentColor: (color: string) => Promise<void>;
};

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColor] = useState('#49C788');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedColor = await AsyncStorage.getItem('@admin_accent_color');
      if (savedColor) {
        setAccentColor(savedColor);
      }
    } catch (e) {
      console.log('Error loading admin theme:', e);
    }
  };

  const changeAccentColor = async (color: string) => {
    try {
      setAccentColor(color);
      await AsyncStorage.setItem('@admin_accent_color', color);
    } catch (e) {
      console.log('Error saving admin theme:', e);
    }
  };

  return (
    <AdminThemeContext.Provider value={{ accentColor, changeAccentColor }}>
      {children}
    </AdminThemeContext.Provider>
  );
};

export const useAdminTheme = () => {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }
  return context;
};
