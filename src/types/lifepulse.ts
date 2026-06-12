export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: number;
}

export interface LifePulseData {
  habits: Habit[];
  logs: Record<string, string[]>; // date (YYYY-MM-DD) -> array of habit IDs
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: number;
  isToday: boolean;
  future?: boolean;
}
