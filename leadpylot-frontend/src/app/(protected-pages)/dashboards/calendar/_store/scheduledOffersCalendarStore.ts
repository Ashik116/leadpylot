import { create } from 'zustand';
import { CalendarEventType } from '../../meetings/_components/eventUtils';

type ScheduledOffersCalendarState = {
  events: CalendarEventType[];
  currentViewTitle: string;
  currentView: 'month' | 'week' | 'day' | 'year';
  calendarReady: boolean;
  sidebarDate: Date | null;
  currentYear: number;
};

type ScheduledOffersCalendarAction = {
  setEvents: (events: CalendarEventType[]) => void;
  setCurrentViewTitle: (title: string) => void;
  setCurrentView: (view: 'month' | 'week' | 'day' | 'year') => void;
  setCalendarReady: (ready: boolean) => void;
  setSidebarDate: (date: Date | null) => void;
  setCurrentYear: (year: number) => void;
};

const initialState: ScheduledOffersCalendarState = {
  events: [],
  currentViewTitle: '',
  currentView: 'month',
  calendarReady: false,
  sidebarDate: new Date(),
  currentYear: new Date().getFullYear(),
};

export const useScheduledOffersCalendarStore = create<
  ScheduledOffersCalendarState & ScheduledOffersCalendarAction
>((set) => ({
  ...initialState,
  setEvents: (events) => set({ events }),
  setCurrentViewTitle: (title) => set({ currentViewTitle: title }),
  setCurrentView: (view) => set({ currentView: view }),
  setCalendarReady: (ready) => set({ calendarReady: ready }),
  setSidebarDate: (date) => set({ sidebarDate: date }),
  setCurrentYear: (year) => set({ currentYear: year }),
}));

