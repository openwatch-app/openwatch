'use client';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { usePathname } from 'next/navigation';
import { Home, History, ListVideo } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ScrollArea } from './scroll-area';
import { useAppStore } from '~lib/store';
import { Separator } from './separator';
import { Channel } from '~app/types';
import { Button } from './button';
import { cn } from '~lib/utils';
import Link from 'next/link';
import axios from 'axios';

interface SidebarItemProps {
	icon: React.ElementType;
	label: string;
	href: string;
	isActive?: boolean;
	isCollapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, isActive, isCollapsed }: SidebarItemProps) => {
	return (
		<Link href={href} className="w-full">
			<Button variant={isActive ? 'secondary' : 'ghost'} className={cn('w-full justify-start gap-4 px-3 mb-1', isCollapsed ? 'flex-col h-auto py-4 gap-1 px-0' : '')}>
				<Icon className="h-5 w-5" />
				<span className={cn('text-sm truncate', isCollapsed ? 'text-[10px]' : '')}>{label}</span>
			</Button>
		</Link>
	);
};

const ExpandedSidebarContent = () => {
	const [channels, setChannels] = useState<Channel[]>([]);
	const pathname = usePathname();

	useEffect(() => {
		const fetchChannels = async () => {
			try {
				const response = await axios.get('/api/channel/subscriptions');
				setChannels(response.data);
			} catch (error) {
				console.error('Error fetching channels:', error);
			}
		};
		fetchChannels();
	}, []);

	return (
		<>
			<ScrollArea className="flex-1 px-3 py-2">
				<div className="space-y-1">
					<SidebarItem icon={Home} label="Home" href="/" isActive={pathname === '/'} />
					<SidebarItem icon={History} label="History" href="/history" isActive={pathname === '/history'} />
					<SidebarItem icon={ListVideo} label="Playlists" href="/playlists" isActive={pathname === '/playlists'} />
				</div>

				<Separator className="my-3" />

				<div className="px-3 mb-2 font-medium">Subscriptions</div>
				<div className="space-y-1">
					{channels.map((channel) => (
						<Link key={channel.id} href={`/channel/${channel.handle || channel.id}`} className="w-full">
							<Button variant="ghost" className="w-full justify-start gap-3 px-3 mb-1">
								<Avatar className="h-6 w-6">
									<AvatarImage src={channel.avatar} />
									<AvatarFallback>{channel.name[0]}</AvatarFallback>
								</Avatar>
								<span className="text-sm truncate flex-1 text-left">{channel.name}</span>
							</Button>
						</Link>
					))}
				</div>
			</ScrollArea>
			<div className="py-4 px-2 text-xs text-muted-foreground text-center whitespace-nowrap">
				Developed with ☕ and ❤️ by{' '}
				<a href="https://github.com/ge0rg3e" target="_blank" rel="noreferrer" className="underline">
					Ge0rg3e
				</a>
			</div>
		</>
	);
};

const CollapsedSidebarContent = () => {
	const pathname = usePathname();

	return (
		<div className="flex flex-col items-center py-2 w-full">
			<SidebarItem icon={Home} label="Home" href="/" isActive={pathname === '/'} isCollapsed />
			<SidebarItem icon={History} label="History" href="/history" isActive={pathname === '/history'} isCollapsed />
			<SidebarItem icon={ListVideo} label="Playlists" href="/playlists" isActive={pathname === '/playlists'} isCollapsed />
		</div>
	);
};

export const Sidebar = () => {
	const { isSidebarOpen, toggleSidebar } = useAppStore();

	return (
		<>
			{/* Mobile Overlay Sidebar */}
			{isSidebarOpen && <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={toggleSidebar} />}
			<aside
				className={cn('fixed left-0 top-14 bottom-0 w-60 bg-background z-50 md:hidden transition-transform duration-300 flex flex-col', isSidebarOpen ? 'translate-x-0' : '-translate-x-full')}
			>
				<ExpandedSidebarContent />
			</aside>

			{/* Desktop Sidebar (Expanded) */}
			<aside className={cn('fixed left-0 top-14 bottom-0 w-60 bg-background z-40 hidden flex-col', isSidebarOpen ? 'md:flex' : 'md:hidden')}>
				<ExpandedSidebarContent />
			</aside>

			{/* Desktop Sidebar (Collapsed) */}
			<aside className={cn('fixed left-0 top-14 bottom-0 w-[72px] bg-background z-40 hidden flex-col items-center', !isSidebarOpen ? 'md:flex' : 'md:hidden')}>
				<CollapsedSidebarContent />
			</aside>
		</>
	);
};
