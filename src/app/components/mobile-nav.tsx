'use client';

import { Home, Zap, History, ListVideo, Search, ArrowLeft, X, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '~lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Button } from './button';

interface MobileNavItemProps {
	icon: React.ElementType;
	label: string;
	href?: string;
	isActive?: boolean;
	onClick?: () => void;
}

const MobileNavItem = ({ icon: Icon, label, href, isActive, onClick }: MobileNavItemProps) => {
	if (onClick) {
		return (
			<button onClick={onClick} className={cn('flex flex-col items-center justify-center w-full h-full space-y-1', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
				<Icon className={cn('h-5 w-5', isActive && 'fill-current')} />
				<span className="text-[10px] font-medium">{label}</span>
			</button>
		);
	}
	return (
		<Link href={href!} className={cn('flex flex-col items-center justify-center w-full h-full space-y-1', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
			<Icon className={cn('h-5 w-5', isActive && 'fill-current')} />
			<span className="text-[10px] font-medium">{label}</span>
		</Link>
	);
};

export const MobileNav = () => {
	const pathname = usePathname();
	const router = useRouter();
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchInput, setSearchInput] = useState('');
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isSearchOpen) {
			try {
				const saved = localStorage.getItem('search_history');
				if (saved) {
					setSearchHistory(JSON.parse(saved));
				}
			} catch (e) {
				console.error('Failed to load search history', e);
			}
			// Focus input when search opens
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [isSearchOpen]);

	const updateHistory = (newHistory: string[]) => {
		setSearchHistory(newHistory);
		try {
			localStorage.setItem('search_history', JSON.stringify(newHistory));
		} catch (e) {
			console.warn('Failed to save search history', e);
		}
	};

	const addToHistory = (query: string) => {
		const newHistory = [query, ...searchHistory.filter((h) => h !== query)].slice(0, 10);
		updateHistory(newHistory);
	};

	const removeFromHistory = (e: React.MouseEvent, item: string) => {
		e.stopPropagation();
		const newHistory = searchHistory.filter((h) => h !== item);
		updateHistory(newHistory);
	};

	const handleSearch = (e: React.FormEvent, query: string = searchInput, source: 'local' | 'network' = 'local') => {
		e.preventDefault();
		if (query.trim()) {
			addToHistory(query.trim());
			router.push(`/results?query=${encodeURIComponent(query.trim())}&source=${source}`);
			setIsSearchOpen(false);
			setSearchInput('');
		}
	};

	return (
		<>
			<nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border md:hidden">
				<div className="flex items-center justify-around h-full">
					<MobileNavItem icon={Home} label="Home" href="/" isActive={pathname === '/'} />
					<MobileNavItem icon={Zap} label="Shorts" href="/shorts" isActive={pathname?.startsWith('/shorts')} />
					<MobileNavItem icon={Search} label="Search" onClick={() => setIsSearchOpen(true)} />
					<MobileNavItem icon={History} label="History" href="/history" isActive={pathname === '/history'} />
					<MobileNavItem icon={ListVideo} label="Playlists" href="/playlists" isActive={pathname === '/playlists'} />
				</div>
			</nav>

			{/* Search Overlay */}
			{isSearchOpen && (
				<div className="fixed inset-0 z-50 bg-background flex flex-col md:hidden animate-in fade-in slide-in-from-bottom-10 duration-200">
					<div className="flex items-center gap-2 p-2 border-b border-border">
						<Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)}>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<form onSubmit={(e) => handleSearch(e)} className="flex-1 flex items-center relative">
							<Input
								ref={inputRef}
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Search OpenWatch"
								className="flex-1 bg-secondary/50 border-none focus-visible:ring-0 rounded-full pl-4 pr-10"
							/>
							{searchInput && (
								<button type="button" onClick={() => setSearchInput('')} className="absolute right-3 text-muted-foreground">
									<X className="h-4 w-4" />
								</button>
							)}
						</form>
						<Button variant="ghost" size="icon" className="bg-secondary/50 rounded-full w-10 h-10" onClick={(e) => handleSearch(e)}>
							<Search className="h-5 w-5" />
						</Button>
					</div>

					<div className="flex-1 overflow-y-auto">
						{searchInput.trim() ? (
							<div className="py-2">
								<button
									className="w-full text-left px-4 py-3 active:bg-orange-600 active:text-white flex items-center justify-between group transition-colors"
									onClick={(e) => handleSearch(e, searchInput, 'local')}
								>
									<div className="flex items-center gap-4">
										<Search className="h-5 w-5 text-muted-foreground group-active:text-white" />
										<span className="font-medium">{searchInput}</span>
									</div>
									<span className="text-xs border border-muted-foreground/30 px-2 py-0.5 rounded text-muted-foreground group-active:text-white group-active:border-white">
										In this instance's network
									</span>
								</button>

								{process.env.NEXT_PUBLIC_ENABLE_FEDERATION === 'true' && (
									<button
										className="w-full text-left px-4 py-3 active:bg-orange-600 active:text-white flex items-center justify-between group transition-colors"
										onClick={(e) => handleSearch(e, searchInput, 'network')}
									>
										<div className="flex items-center gap-4">
											<Search className="h-5 w-5 text-muted-foreground group-active:text-white" />
											<span className="font-medium">{searchInput}</span>
										</div>
										<span className="text-xs border border-muted-foreground/30 px-2 py-0.5 rounded text-muted-foreground group-active:text-white group-active:border-white">
											In the vidiverse
										</span>
									</button>
								)}
							</div>
						) : searchHistory.length > 0 ? (
							<div className="py-2">
								{searchHistory.map((item) => (
									<div
										key={item}
										className="flex items-center justify-between px-4 py-3 active:bg-secondary/20"
										onClick={() => {
											setSearchInput(item);
											inputRef.current?.focus();
										}}
									>
										<div className="flex items-center gap-4 overflow-hidden">
											<Clock className="h-5 w-5 text-muted-foreground shrink-0" />
											<span className="font-medium truncate">{item}</span>
										</div>
										<Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground" onClick={(e) => removeFromHistory(e, item)}>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						) : null}
					</div>
				</div>
			)}
		</>
	);
};
