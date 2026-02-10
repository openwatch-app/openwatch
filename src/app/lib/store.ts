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
	theaterMode: boolean;
	setTheaterMode: (enabled: boolean) => void;
	autoplay: boolean;
	setAutoplay: (enabled: boolean) => void;
	playbackRate: number;
	setPlaybackRate: (rate: number) => void;
	ambientMode: boolean;
	setAmbientMode: (enabled: boolean) => void;
	searchHistory: string[];
	addToSearchHistory: (query: string) => void;
	removeFromSearchHistory: (query: string) => void;
	clearSearchHistory: () => void;
	language: string;
	setLanguage: (lang: string) => void;
}

export const useAppStore = create<AppState>()(
	persist(
		(set, get) => ({
			isSidebarOpen: true,
			language: 'en',
			setLanguage: (language: string) => set({ language }),
			volume: 1,
			setVolume: (volume: number) => set({ volume }),
			isMuted: false,
			setIsMuted: (isMuted: boolean) => set({ isMuted }),
			theaterMode: false,
			setTheaterMode: (enabled: boolean) => set({ theaterMode: enabled }),
			autoplay: true,
			setAutoplay: (enabled: boolean) => set({ autoplay: enabled }),
			playbackRate: 1,
			setPlaybackRate: (rate: number) => set({ playbackRate: rate }),
			ambientMode: true,
			setAmbientMode: (enabled: boolean) => set({ ambientMode: enabled }),
			searchHistory: [],
			addToSearchHistory: (query: string) =>
				set((state) => ({
					searchHistory: [query, ...state.searchHistory.filter((h) => h !== query)].slice(0, 5)
				})),
			removeFromSearchHistory: (query: string) =>
				set((state) => ({
					searchHistory: state.searchHistory.filter((h) => h !== query)
				})),
			clearSearchHistory: () => set({ searchHistory: [] }),
			toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
			closeSidebar: () => set({ isSidebarOpen: false })
		}),
		{
			name: '@app',
			partialize: (state) => ({
				isSidebarOpen: state.isSidebarOpen,
				volume: state.volume,
				isMuted: state.isMuted,
				theaterMode: state.theaterMode,
				autoplay: state.autoplay,
				playbackRate: state.playbackRate,
				ambientMode: state.ambientMode,
				searchHistory: state.searchHistory,
				language: state.language
			})
		}
	)
);
