import { DetectionResult } from '../types';

const STORAGE_KEY = 'fire-detection-history';

export const saveToHistory = (result: DetectionResult): void => {
  try {
    const history = getHistory();
    // Add new result at the beginning
    history.unshift({
      ...result,
      timestamp: result.timestamp.toISOString(),
    });
    // Keep only last 50 results
    const limitedHistory = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
};

export const getHistory = (): DetectionResult[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
};

export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
};

export const deleteHistoryItem = (id: string): void => {
  try {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(
      filtered.map(item => ({
        ...item,
        timestamp: item.timestamp.toISOString(),
      }))
    ));
  } catch (error) {
    console.error('Failed to delete history item:', error);
  }
};
