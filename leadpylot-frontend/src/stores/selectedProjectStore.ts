import { create } from 'zustand';
import { Project } from '@/services/ProjectsService';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ProjectSelectorOption = Project & {
  value: string;
  label: string;
};

interface SelectedProjectState {
  selectedProject: ProjectSelectorOption | null;
  setSelectedProject: (project: ProjectSelectorOption | null) => void;
  /** All projects array - set when ProjectSelector is active/loaded. Use when you need the full project list. */
  allProjects?: ProjectSelectorOption[];
  setAllProjects: (projects: ProjectSelectorOption[] | undefined) => void;
}

export const useSelectedProjectStore = create<SelectedProjectState>()(
  persist(
    (set) => ({
      selectedProject: null,
      setSelectedProject: (project) => set({ selectedProject: project }),
      allProjects: undefined,
      setAllProjects: (projects) => set({ allProjects: projects }),
    }),
    {
      name: 'selected-project',
      storage:
        typeof window !== 'undefined'
          ? createJSONStorage(() => localStorage)
          : (undefined as unknown as ReturnType<typeof createJSONStorage>),
      partialize: (state) => ({ selectedProject: state.selectedProject }),
    }
  )
);
