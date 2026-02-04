'use client';

import { LayoutDashboard, PlaySquare, BarChart2, MessageSquare, Captions, Copyright, DollarSign, Wand2, Music, Settings, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { useAppStore } from '~lib/store';
import { usePathname } from 'next/navigation';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { Button } from './button';
import { cn } from '~lib/utils';
import Link from 'next/link';
import { useState } from 'react';

interface SidebarItemProps {
	icon: React.ElementType;
	label: string;
	href: string;
	isActive?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, isActive }: SidebarItemProps) => {
	return (
		<Link href={href} className="w-full">
			<Button
				variant={isActive ? 'secondary' : 'ghost'}
				className={cn(
					'w-full justify-start gap-4 px-3 mb-1 relative',
					isActive ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-orange-600 before:rounded-r-full' : ''
				)}
			>
				<Icon className={cn('h-5 w-5', isActive ? 'text-orange-600' : 'text-muted-foreground')} />
				<span className={cn('text-sm', isActive ? 'font-medium text-orange-600' : '')}>{label}</span>
			</Button>
		</Link>
	);
};

import { authClient } from '~lib/auth-client';

const StudioSidebarContent = () => {
	const { data: session } = authClient.useSession();
	const pathname = usePathname();

	if (!session?.user) return null;

	return (
		<>
			<ScrollArea className="flex-1 px-0 pt-5">
				<div className="space-y-0.5">
					<SidebarItem icon={LayoutDashboard} label="Dashboard" href="/studio" isActive={pathname === '/studio'} />
					<SidebarItem icon={Wand2} label="Customization" href="/studio/customization" isActive={pathname === '/studio/customization'} />
				</div>
			</ScrollArea>
			<div className="py-4 px-2 border-t text-xs text-muted-foreground text-center whitespace-nowrap">
				Developed with ☕ and ❤️ by{' '}
				<a href="https://github.com/ge0rg3e" target="_blank" rel="noreferrer" className="hover:underline text-orange-500">
					Ge0rg3e
				</a>
			</div>
		</>
	);
};

const StudioSidebar = () => {
	const { isSidebarOpen, toggleSidebar } = useAppStore();

	return (
		<>
			{/* Mobile Overlay Sidebar */}
			{isSidebarOpen && <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={toggleSidebar} />}
			<aside
				className={cn(
					'fixed left-0 top-14 bottom-0 w-64 bg-background border-r z-50 md:hidden transition-transform duration-300 flex flex-col',
					isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
				)}
			>
				<StudioSidebarContent />
			</aside>

			{/* Desktop Sidebar (Always Visible) */}
			<aside className="fixed left-0 top-14 bottom-0 w-64 bg-background border-r z-40 hidden md:flex flex-col">
				<StudioSidebarContent />
			</aside>
		</>
	);
};

export default StudioSidebar;
