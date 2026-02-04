import { persist } from 'zustand/middleware';
import { create } from 'zustand';

interface AppState {
	isSidebarOpen: boolean;
	toggleSidebar: () => void;
	closeSidebar: () => void;
	volume: number;
	setVolume: (volume: number) => void;
	isMuted: boolean;
	setIsMuted: (isMuted: boolean) => void;
}

export const useAppStore = create<AppState>()(
	persist(
		(set, get) => ({
			isSidebarOpen: true,
			volume: 1,
			setVolume: (volume: number) => set({ volume }),
			isMuted: false,
			setIsMuted: (isMuted: boolean) => set({ isMuted }),
			toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
			closeSidebar: () => set({ isSidebarOpen: false })
		}),
		{
			name: '@app',
			partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen, volume: state.volume, isMuted: state.isMuted })
		}
	)
);
