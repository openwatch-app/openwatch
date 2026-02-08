'use client';

import { NotificationCenter } from '~components/notification-center';
import { Menu, Search, Video, User, X, History, Trash2 } from 'lucide-react';
import { authClient } from '~lib/auth-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '../lib/store';
import UserDropdown from './user-dropdown';
import { Button } from './button';
import { Badge } from './badge';
import { useState, useRef, useEffect, Suspense } from 'react';
import { Input } from './input';
import Link from 'next/link';

const NavbarContent = () => {
	const { toggleSidebar } = useAppStore();
	const { data: session } = authClient.useSession();
	const [searchInput, setSearchInput] = useState('');
	const [isFocused, setIsFocused] = useState(false);
	const searchContainerRef = useRef<HTMLFormElement>(null);
	const router = useRouter();
	const searchParams = useSearchParams();
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(-1);

	useEffect(() => {
		const saved = localStorage.getItem('search_history');
		if (saved) {
			try {
				setSearchHistory(JSON.parse(saved));
			} catch (e) {
				console.error('Failed to parse search history', e);
			}
		}
	}, []);

	const updateHistory = (newHistory: string[]) => {
		setSearchHistory(newHistory);
		localStorage.setItem('search_history', JSON.stringify(newHistory));
	};

	const addToHistory = (query: string) => {
		const newHistory = [query, ...searchHistory.filter((h) => h !== query)].slice(0, 5);
		updateHistory(newHistory);
	};

	const removeFromHistory = (e: React.MouseEvent, item: string) => {
		e.stopPropagation();
		const newHistory = searchHistory.filter((h) => h !== item);
		updateHistory(newHistory);
	};

	useEffect(() => {
		const query = searchParams.get('query');
		if (query) {
			setSearchInput(query);
		}
	}, [searchParams]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
				setIsFocused(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleSearch = (e: React.FormEvent, source: 'local' | 'network' = 'local') => {
		e.preventDefault();
		if (searchInput.trim()) {
			addToHistory(searchInput.trim());
			router.push(`/results?query=${encodeURIComponent(searchInput)}&source=${source}`);
			setIsFocused(false);
			setSelectedIndex(-1);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		const items = searchInput.trim()
			? [{ type: 'source', value: 'local' }, ...(process.env.NEXT_PUBLIC_ENABLE_FEDERATION === 'true' ? [{ type: 'source', value: 'network' }] : [])]
			: searchHistory.map((item) => ({ type: 'history', value: item }));

		if (!items.length) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedIndex((prev) => (prev + 1) % items.length);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
		} else if (e.key === 'Enter') {
			if (selectedIndex >= 0) {
				e.preventDefault();
				const item = items[selectedIndex];
				if (item.type === 'source') {
					handleSearch(e, item.value as 'local' | 'network');
				} else {
					setSearchInput(item.value);
					// Don't auto-search for history items via Enter, let user choose source
					setSelectedIndex(-1);
					// Ensure input keeps focus to show source options
					if (searchContainerRef.current?.querySelector('input')) {
						(searchContainerRef.current.querySelector('input') as HTMLElement).focus();
					}
				}
			}
		}
	};

	return (
		<nav className="fixed top-0 left-0 right-0 h-14 bg-background z-50 flex items-center justify-between px-4">
			<div className="flex items-center">
				<Button variant="ghost" size="icon" className="mr-2 hidden md:flex" onClick={toggleSidebar}>
					<Menu className="h-5 w-5" />
				</Button>
				<Link href="/" className="flex items-center gap-2">
					<div className="bg-primary text-white p-1 rounded-lg">
						<Video className="h-4 w-4 fill-current" />
					</div>
					<span className="text-xl font-bold tracking-tighter">OpenWatch</span>
					<Badge variant="secondary" className="text-[10px] px-1.5 h-5 rounded-full uppercase">
						beta
					</Badge>
				</Link>
			</div>

			<form ref={searchContainerRef} onSubmit={(e) => handleSearch(e, 'local')} className="hidden md:flex items-center flex-1 max-w-2xl mx-4 relative">
				<div className="flex w-full items-center ml-10 relative">
					<div className="relative w-full flex">
						<Input
							placeholder="Search"
							className="rounded-l-full rounded-r-none focus-visible:ring-0 border-r-0 shadow-none pl-4 pr-8"
							value={searchInput}
							onChange={(e) => {
								setSearchInput(e.target.value);
								setSelectedIndex(-1);
							}}
							onFocus={() => setIsFocused(true)}
							onKeyDown={handleKeyDown}
						/>
						{searchInput && (
							<button type="button" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
					<Button type="submit" variant="secondary" className="rounded-r-full rounded-l-none border border-l-0 px-5 bg-secondary/50 hover:bg-secondary/70 shadow-none">
						<Search className="h-4 w-4" />
					</Button>

					{isFocused && (searchInput.trim() || searchHistory.length > 0) && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden py-1 z-50">
							{searchInput.trim() ? (
								<>
									<button
										className={`w-full text-left px-4 py-2 hover:bg-orange-600 hover:text-white flex items-center justify-between group transition-colors ${
											selectedIndex === 0 ? 'bg-orange-600 text-white' : ''
										}`}
										onClick={(e) => handleSearch(e, 'local')}
									>
										<div className="flex items-center gap-3">
											<Search className={`h-4 w-4 text-muted-foreground group-hover:text-white ${selectedIndex === 0 ? 'text-white' : ''}`} />
											<span className="font-medium">{searchInput}</span>
										</div>
										<span
											className={`text-xs border border-muted-foreground/30 px-2 py-0.5 rounded text-muted-foreground group-hover:text-white group-hover:border-white ${
												selectedIndex === 0 ? 'text-white border-white' : ''
											}`}
										>
											In this instance's network
										</span>
									</button>

									{process.env.NEXT_PUBLIC_ENABLE_FEDERATION === 'true' && (
										<button
											className={`w-full text-left px-4 py-2 hover:bg-orange-600 hover:text-white flex items-center justify-between group transition-colors ${
												selectedIndex === 1 ? 'bg-orange-600 text-white' : ''
											}`}
											onClick={(e) => handleSearch(e, 'network')}
										>
											<div className="flex items-center gap-3">
												<Search className={`h-4 w-4 text-muted-foreground group-hover:text-white ${selectedIndex === 1 ? 'text-white' : ''}`} />
												<span className="font-medium">{searchInput}</span>
											</div>
											<span
												className={`text-xs border border-muted-foreground/30 px-2 py-0.5 rounded text-muted-foreground group-hover:text-white group-hover:border-white ${
													selectedIndex === 1 ? 'text-white border-white' : ''
												}`}
											>
												In the vidiverse
											</span>
										</button>
									)}
								</>
							) : (
								<>
									<div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent</div>
									{searchHistory.map((item, index) => (
										<button
											key={item}
											className={`w-full text-left px-4 py-2 hover:bg-secondary/50 flex items-center justify-between group transition-colors ${
												selectedIndex === index ? 'bg-secondary/50' : ''
											}`}
											onClick={() => {
												setSearchInput(item);
												setSelectedIndex(-1);
												if (searchContainerRef.current?.querySelector('input')) {
													(searchContainerRef.current.querySelector('input') as HTMLElement).focus();
												}
											}}
										>
											<div className={`flex items-center gap-3 text-muted-foreground group-hover:text-foreground ${selectedIndex === index ? 'text-foreground' : ''}`}>
												<History className="h-4 w-4" />
												<span className="font-medium">{item}</span>
											</div>
											<div
												className="p-1 hover:bg-background rounded-full text-muted-foreground hover:text-destructive transition-colors"
												onClick={(e) => removeFromHistory(e, item)}
											>
												<Trash2 className="h-3 w-3" />
											</div>
										</button>
									))}
								</>
							)}
						</div>
					)}
				</div>
			</form>

			<div className="flex items-center gap-2">
				{session?.user ? (
					<>
						<NotificationCenter />
						<UserDropdown user={session.user} />
					</>
				) : (
					<Link href="/auth">
						<Button variant="outline" className="rounded-full">
							<User className="mr-2 h-5 w-5" />
							Sign in
						</Button>
					</Link>
				)}
			</div>
		</nav>
	);
};

const Navbar = () => (
	<Suspense>
		<NavbarContent />
	</Suspense>
);

export default Navbar;
