import { persist } from 'zustand/middleware';
import { create } from 'zustand';

interface AppState {
	isSidebarOpen: boolean;
	toggleSidebar: () => void;
	closeSidebar: () => void;
}

export const useAppStore = create<AppState>()(
	persist(
		(set, get) => ({
			isSidebarOpen: true,
			toggleSidebar: () => {
				set((state) => {
					const newState = { isSidebarOpen: !state.isSidebarOpen };
					console.log('toggleSidebar - new state:', newState.isSidebarOpen);
					return newState;
				});
			},
			closeSidebar: () => {
				set({ isSidebarOpen: false });
				console.log('closeSidebar - new state: false');
			}
		}),
		{
			name: '@app',
			partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen })
		}
	)
);
