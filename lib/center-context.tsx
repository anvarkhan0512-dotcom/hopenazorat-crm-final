'use client';
import { createContext, useContext, useEffect, useState } from 'react';

interface CenterContextType {
  centerName: string;
  centerId: string | null;
}

const CenterContext = createContext<CenterContextType>({
  centerName: 'Hope Study',
  centerId: null
});

export function CenterProvider({
  children
}: { children: React.ReactNode }) {
  const [centerName, setCenterName] = useState('Hope Study');
  const [centerId, setCenterId] = useState<string|null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.centerName) {
          setCenterName(data.centerName);
          document.title = data.centerName;
        }
        if (data.centerId) setCenterId(data.centerId);
      })
      .catch(() => {});
  }, []);

  return (
    <CenterContext.Provider value={{ centerName, centerId }}>
      {children}
    </CenterContext.Provider>
  );
}

export const useCenter = () => useContext(CenterContext);
