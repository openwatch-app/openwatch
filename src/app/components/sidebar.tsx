'use client';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { usePathname } from 'next/navigation';
import { Home, History, ListVideo, Zap } from 'lucide-react';
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
			<Button
				variant={isActive ? 'secondary' : 'ghost'}
				className={cn(
					'w-full justify-start gap-4 px-3 mb-1 h-auto py-2 whitespace-normal transition-all duration-200 ease-in-out',
					isActive && 'font-medium shadow-sm bg-secondary/80 hover:bg-secondary',
					isCollapsed && 'flex-col py-4 gap-1 px-0 rounded-2xl'
				)}
			>
				<Icon className={cn('h-5 w-5 shrink-0 transition-transform duration-200', isActive && 'scale-110 text-primary')} />
				<span
					className={cn(
						'text-sm text-left wrap-break-word line-clamp-2 transition-colors',
						isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
						isCollapsed ? 'text-[10px] line-clamp-1 break-all' : ''
					)}
				>
					{label}
				</span>
			</Button>
		</Link>
	);
};

const ExpandedSidebarContent = () => {
	const [channels, setChannels] = useState<Channel[]>([]);
	const [latestVersion, setLatestVersion] = useState<string | null>(null);
	const pathname = usePathname();
	const currentVersion = (process.env.NEXT_PUBLIC_APP_VERSION as string) || '0.0.0';

	useEffect(() => {
		const fetchChannels = async () => {
			try {
				const response = await axios.get('/api/channel/subscriptions');
				setChannels(response.data);
			} catch (error) {
				console.error('Error fetching channels:', error);
			}
		};

		const checkVersion = async () => {
			try {
				const response = await axios.get('https://raw.githubusercontent.com/openwatch-app/openwatch/refs/heads/main/package.json');
				if (response.data && response.data.version) {
					setLatestVersion(response.data.version);
				}
			} catch (e) {
				console.error('Error fetching version:', e);
			}
		};

		fetchChannels();
		checkVersion();
	}, []);

	const isLatest = latestVersion ? currentVersion.replace('v', '') === latestVersion.replace('v', '') : true;

	return (
		<>
			<ScrollArea className="flex-1 px-3 py-4">
				<div className="space-y-1">
					<SidebarItem icon={Home} label="Home" href="/" isActive={pathname === '/'} />
					<SidebarItem icon={Zap} label="Shorts" href="/shorts" isActive={pathname?.startsWith('/shorts')} />
					<SidebarItem icon={History} label="History" href="/history" isActive={pathname === '/history'} />
					<SidebarItem icon={ListVideo} label="Playlists" href="/playlists" isActive={pathname === '/playlists'} />
				</div>

				<Separator className="my-4 bg-border/40" />

				<div className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Subscriptions</div>
				<div className="space-y-1">
					{channels.map((channel) => (
						<Link key={channel.id} href={`/channel/${channel.handle || channel.id}`} className="w-full group">
							<Button variant="ghost" className="w-full justify-start gap-3 px-3 mb-1 h-auto py-2 whitespace-normal transition-colors hover:bg-accent/50">
								<Avatar className="h-6 w-6 shrink-0 border border-transparent group-hover:border-border/50 transition-colors">
									<AvatarImage src={channel.avatar} />
									<AvatarFallback>{channel.name[0]}</AvatarFallback>
								</Avatar>
								<span className="text-sm text-left wrap-break-word line-clamp-2 flex-1 text-muted-foreground group-hover:text-foreground transition-colors">{channel.name}</span>
							</Button>
						</Link>
					))}
				</div>
			</ScrollArea>

			<div className="p-4 mt-auto border-t bg-card/30 backdrop-blur-[2px]">
				<div className="flex flex-col gap-3">
					<Link
						href="https://github.com/openwatch-app/openwatch/issues/new"
						className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
						target="_blank"
						rel="noopener noreferrer"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-red-500/70 group-hover:bg-red-500 transition-colors" />
						Report a BUG / Request a feature
					</Link>

					<div className="text-xs text-muted-foreground">
						Powered by{' '}
						<Link
							href="https://github.com/openwatch-app/openwatch"
							className="text-foreground font-medium hover:underline decoration-border underline-offset-2"
							target="_blank"
							rel="noopener noreferrer"
						>
							OpenWatch
						</Link>
					</div>

					<div className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5 font-mono">
						<span>v{currentVersion}</span>
						{latestVersion && !isLatest ? (
							<span className="text-amber-500/90 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-[4px] text-[9px] border border-amber-500/20">Update: {latestVersion}</span>
						) : (
							<span className="text-emerald-500/60 ml-1">• latest</span>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

const CollapsedSidebarContent = () => {
	const pathname = usePathname();

	return (
		<div className="flex flex-col items-center py-2 w-full">
			<SidebarItem icon={Home} label="Home" href="/" isActive={pathname === '/'} isCollapsed />
			<SidebarItem icon={Zap} label="Shorts" href="/shorts" isActive={pathname?.startsWith('/shorts')} isCollapsed />
			<SidebarItem icon={History} label="History" href="/history" isActive={pathname === '/history'} isCollapsed />
			<SidebarItem icon={ListVideo} label="Playlists" href="/playlists" isActive={pathname === '/playlists'} isCollapsed />
		</div>
	);
};

export const Sidebar = () => {
	const { isSidebarOpen } = useAppStore();

	return (
		<>
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
