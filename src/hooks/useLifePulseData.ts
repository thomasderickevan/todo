import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Habit, LifePulseData } from '../types/lifepulse';
import { getLocalDateString } from '../utils/dateUtils';
import confetti from 'canvas-confetti';

const DEFAULT_DATA: LifePulseData = { habits: [], logs: {} };

export const useLifePulseData = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<LifePulseData>(DEFAULT_DATA);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        const local = localStorage.getItem('lifepulse_guest');
        if (local) {
          try {
            setData(JSON.parse(local));
          } catch (e) {
            console.error("Local parse error", e);
          }
        } else {
          setData(DEFAULT_DATA);
        }
        setDataLoaded(true);
        return;
      }

      try {
        const docRef = doc(db, 'lifepulse', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data() as LifePulseData);
        } else {
          setData(DEFAULT_DATA);
        }
      } catch (error) {
        console.error("Firebase read error", error);
        // Fallback to local
        const local = localStorage.getItem(`lifepulse_${user.uid}`);
        if (local) setData(JSON.parse(local));
      }
      setDataLoaded(true);
    };

    if (!authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  const saveData = useCallback(async (newData: LifePulseData) => {
    setData(newData);
    if (!user) {
      localStorage.setItem('lifepulse_guest', JSON.stringify(newData));
    } else {
      localStorage.setItem(`lifepulse_${user.uid}`, JSON.stringify(newData));
      try {
        await setDoc(doc(db, 'lifepulse', user.uid), newData);
      } catch (error) {
        console.error("Firebase write error", error);
      }
    }
  }, [user]);

  const addHabit = useCallback((name: string, emoji: string, color: string) => {
    if (!name.trim()) return;
    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      name: name.trim(),
      emoji: emoji,
      color: color,
      createdAt: Date.now()
    };
    const newData = {
      ...data,
      habits: [...data.habits, newHabit]
    };
    saveData(newData);
  }, [data, saveData]);

  const deleteHabit = useCallback((id: string) => {
    const newHabits = data.habits.filter(h => h.id !== id);
    // Cleanup logs
    const newLogs: Record<string, string[]> = {};
    for (const [date, ids] of Object.entries(data.logs)) {
      const filteredIds = ids.filter(logId => logId !== id);
      if (filteredIds.length > 0) {
        newLogs[date] = filteredIds;
      }
    }
    const newData = { habits: newHabits, logs: newLogs };
    saveData(newData);
  }, [data, saveData]);

  const toggleHabit = useCallback((habitId: string, date: string) => {
    const prevLogsForDate = data.logs[date] || [];
    const isCompleted = prevLogsForDate.includes(habitId);

    let newLogsForDate;
    if (isCompleted) {
      newLogsForDate = prevLogsForDate.filter(id => id !== habitId);
    } else {
      newLogsForDate = [...prevLogsForDate, habitId];

      // Check if all habits for today are done now
      if (date === getLocalDateString() && newLogsForDate.length === data.habits.length && data.habits.length > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF6B35', '#FFF', '#000']
        });
      }
    }

    const newLogs = { ...data.logs };
    if (newLogsForDate.length === 0) {
      delete newLogs[date];
    } else {
      newLogs[date] = newLogsForDate;
    }

    const newData = { ...data, logs: newLogs };
    saveData(newData);
  }, [data, saveData]);

  return {
    data,
    dataLoaded,
    addHabit,
    deleteHabit,
    toggleHabit,
    saveData
  };
};
