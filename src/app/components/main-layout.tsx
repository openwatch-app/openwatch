'use client';

import { useAppStore } from '~lib/store';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { useEffect } from 'react';
import { cn } from '~lib/utils';
import Navbar from './navbar';
import '~lib/dayjs-config';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
	const { isSidebarOpen, closeSidebar } = useAppStore();

	useEffect(() => {
		// Close sidebar on mobile by default
		if (window.innerWidth < 768) {
			closeSidebar();
		}
	}, [closeSidebar]);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<Navbar />
			<div className="flex pt-14">
				<Sidebar />
				<main className={cn('flex-1 transition-all duration-300 pb-16 md:pb-0', isSidebarOpen ? 'md:ml-60' : 'md:ml-[72px]')}>{children}</main>
			</div>
			<MobileNav />
		</div>
	);
};

export default MainLayout;
