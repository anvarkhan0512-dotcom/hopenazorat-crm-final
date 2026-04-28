import { Language } from '@/lib/translations';

export interface LocalData备份 {
  students: LocalStudent[];
  groups: LocalGroup[];
  payments: LocalPayment[];
  lastSync: number;
  version: string;
}

export interface LocalStudent {
  _id: string;
  name: string;
  phone: string;
  groupId?: string;
  status: 'active' | 'inactive';
  monthlyPrice: number;
  createdAt: string;
}

export interface LocalGroup {
  _id: string;
  name: string;
  teacherName: string;
  schedule: string;
  price: number;
  studentIds: string[];
  room: string;
  isActive: boolean;
  maxStudents: number;
  createdAt: string;
}

export interface LocalPayment {
  _id: string;
  studentId: string;
  amount: number;
  month: number;
  year: number;
  description: string;
  createdAt: string;
}

const STORAGE_KEY = 'edu-crm-local-data';
const VERSION = '1.0.0';

export function getLocalData(): LocalData备份 | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading local data:', error);
    return null;
  }
}

export function setLocalData(data: LocalData备份): void {
  if (typeof window === 'undefined') return;
  
  try {
    data.version = VERSION;
    data.lastSync = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving local data:', error);
  }
}

export function clearLocalData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(STORAGE_KEY);
}

export function getLastSyncTime(): number | null {
  const data = getLocalData();
  return data?.lastSync || null;
}

export function isDataStale(maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  const lastSync = getLastSyncTime();
  if (!lastSync) return true;
  
  return Date.now() - lastSync > maxAgeMs;
}

export async function syncFromServer(): Promise<boolean> {
  try {
    const [studentsRes, groupsRes, paymentsRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/groups'),
      fetch('/api/payments'),
    ]);
    
    if (!studentsRes.ok) throw new Error('Failed to fetch students');
    
    const students = await studentsRes.json();
    const groups = await groupsRes.json();
    const payments = await paymentsRes.json();
    
    setLocalData({
      students,
      groups,
      payments,
      lastSync: Date.now(),
      version: VERSION,
    });
    
    return true;
  } catch (error) {
    console.error('Sync error:', error);
    return false;
  }
}

export function exportToJSON(): string {
  const data = getLocalData();
  return JSON.stringify(data, null, 2);
}

export function importFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!data.students || !data.groups) {
      throw new Error('Invalid data format');
    }
    
    setLocalData(data);
    return true;
  } catch (error) {
    console.error('Import error:', error);
    return false;
  }
}

export function getExportUrl(): string {
  const data = exportToJSON();
  const blob = new Blob([data], { type: 'application/json' });
  return URL.createObjectURL(blob);
}