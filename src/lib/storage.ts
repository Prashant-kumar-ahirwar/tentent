import { KirayaData, KirayaRoom } from '../types';
import { INITIAL_CLEAN_DATA } from '../data/seedData';

const STORAGE_KEY = 'kirayabahi_clean_v3';

export const getStoredKirayaData = (): KirayaData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rooms)) {
        return parsed;
      }
    }
    // Clean blank start for every new user
    return JSON.parse(JSON.stringify(INITIAL_CLEAN_DATA));
  } catch (e) {
    console.error('Failed to load data from storage', e);
    return JSON.parse(JSON.stringify(INITIAL_CLEAN_DATA));
  }
};

export const saveStoredKirayaData = (data: KirayaData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data to localStorage', e);
  }
};

export const resetToCleanLedger = (): KirayaData => {
  const clean = JSON.parse(JSON.stringify(INITIAL_CLEAN_DATA));
  saveStoredKirayaData(clean);
  return clean;
};
