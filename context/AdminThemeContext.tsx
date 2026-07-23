import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AdminThemeContextType = {
  accentColor: string;
  changeAccentColor: (color: string) => Promise<void>;
};

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

// Provee el color de acento del tema admin y lo persiste en AsyncStorage
export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColor] = useState('#49C788');

  useEffect(() => {
    loadTheme();
  }, []);

  // Carga el color de acento guardado previamente en AsyncStorage
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

  // Actualiza el color de acento en estado y lo guarda en AsyncStorage
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

// Hook para acceder al contexto del tema admin (color de acento)
export const useAdminTheme = () => {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }
  return context;
};
