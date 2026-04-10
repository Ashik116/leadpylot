import { create } from 'zustand';
import { TLead } from '@/services/LeadsService';
import { CalendarEventType } from '../types';

type CalendarState = {
  events: CalendarEventType[];
  isAddEventOpen: boolean;
  selectedDate?: Date;
  currentViewTitle: string;
  currentView: 'month' | 'week' | 'day' | 'year';
  calendarReady: boolean;
  sidebarDate: Date | null;
  currentYear: number;
  selectedEvent: CalendarEventType | null;
  isEventModalOpen: boolean;
  isEditEventModalOpen: boolean;
  leadData: TLead | null;
};

type CalendarAction = {
  setEvents: (events: CalendarEventType[]) => void;
  setIsAddEventOpen: (isOpen: boolean) => void;
  setSelectedDate: (date?: Date) => void;
  setCurrentViewTitle: (title: string) => void;
  setCurrentView: (view: 'month' | 'week' | 'day' | 'year') => void;
  setCalendarReady: (ready: boolean) => void;
  setSidebarDate: (date: Date | null) => void;
  setCurrentYear: (year: number) => void;
  setSelectedEvent: (event: CalendarEventType | null) => void;
  setIsEventModalOpen: (isOpen: boolean) => void;
  setIsEditEventModalOpen: (isOpen: boolean) => void;
  setLeadData: (lead: TLead | null) => void;
  addEvent: (event: CalendarEventType) => void;
  updateEvent: (event: CalendarEventType) => void;
  deleteEvent: (eventId: string) => void;
};

const initialState: CalendarState = {
  events: [],
  isAddEventOpen: false,
  selectedDate: undefined,
  currentViewTitle: '',
  currentView: 'month',
  calendarReady: false,
  sidebarDate: new Date(),
  currentYear: new Date().getFullYear(),
  selectedEvent: null,
  isEventModalOpen: false,
  isEditEventModalOpen: false,
  leadData: null,
};

export const useCalendarStore = create<CalendarState & CalendarAction>((set) => ({
  ...initialState,
  setEvents: (events) => set({ events }),
  setIsAddEventOpen: (isOpen) => set({ isAddEventOpen: isOpen }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentViewTitle: (title) => set({ currentViewTitle: title }),
  setCurrentView: (view) => set({ currentView: view }),
  setCalendarReady: (ready) => set({ calendarReady: ready }),
  setSidebarDate: (date) => set({ sidebarDate: date }),
  setCurrentYear: (year) => set({ currentYear: year }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setIsEventModalOpen: (isOpen) => set({ isEventModalOpen: isOpen }),
  setIsEditEventModalOpen: (isOpen) => set({ isEditEventModalOpen: isOpen }),
  setLeadData: (lead) => set({ leadData: lead }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (updatedEvent) =>
    set((state) => ({
      events: state.events.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
    })),
  deleteEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId),
    })),
}));
