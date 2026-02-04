'use client';

import { LayoutDashboard, Users, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { useAppStore } from '~lib/store';
import { usePathname } from 'next/navigation';
import { ScrollArea } from './scroll-area';
import { Button } from './button';
import { cn } from '~lib/utils';
import Link from 'next/link';
import { authClient } from '~lib/auth-client';

interface SidebarItemProps {
	icon: React.ElementType;
	label: string;
	href: string;
	isActive?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, isActive }: SidebarItemProps) => {
	return (
		<Link href={href} className="w-full">
			<Button variant={isActive ? 'secondary' : 'ghost'} className={cn('w-full justify-start gap-4 px-3 mb-1')}>
				<Icon className="h-5 w-5" />
				<span className="text-sm">{label}</span>
			</Button>
		</Link>
	);
};

const ConsoleSidebarContent = () => {
	const { data: session } = authClient.useSession();
	const pathname = usePathname();

	if (!session?.user) return null;

	return (
		<>
			<ScrollArea className="flex-1 px-0 pt-5">
				<div className="space-y-0.5">
					<SidebarItem icon={LayoutDashboard} label="Dashboard" href="/console" isActive={pathname === '/console'} />
					<SidebarItem icon={Users} label="Users" href="/console/users" isActive={pathname === '/console/users'} />
					<SidebarItem icon={Settings} label="Settings" href="/console/settings" isActive={pathname === '/console/settings'} />
				</div>
			</ScrollArea>
			<div className="py-4 px-2 text-xs text-muted-foreground text-center whitespace-nowrap">
				Developed with ☕ and ❤️ by{' '}
				<a href="https://github.com/ge0rg3e" target="_blank" rel="noreferrer" className="hover:underline text-orange-500">
					Ge0rg3e
				</a>
			</div>
		</>
	);
};

const ConsoleSidebar = () => {
	const { isSidebarOpen, toggleSidebar } = useAppStore();

	return (
		<>
			{/* Mobile Overlay Sidebar */}
			{isSidebarOpen && <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={toggleSidebar} />}
			<aside
				className={cn('fixed left-0 top-14 bottom-0 w-64 bg-background z-50 md:hidden transition-transform duration-300 flex flex-col', isSidebarOpen ? 'translate-x-0' : '-translate-x-full')}
			>
				<ConsoleSidebarContent />
			</aside>

			{/* Desktop Sidebar (Always Visible) */}
			<aside className="fixed left-0 top-14 bottom-0 w-64 bg-background z-40 hidden md:flex flex-col">
				<ConsoleSidebarContent />
			</aside>
		</>
	);
};

export default ConsoleSidebar;
