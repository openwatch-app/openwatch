'use client';

import StudioSidebar from '~components/studio-sidebar';
import StudioNavbar from '~components/studio-navbar';
import { useAppStore } from '~lib/store';
import { useEffect } from 'react';
import '~lib/dayjs-config';

const StudioLayout = ({ children }: { children: React.ReactNode }) => {
	const { closeSidebar } = useAppStore();

	useEffect(() => {
		// Close sidebar on mobile by default
		if (window.innerWidth < 768) {
			closeSidebar();
		}
	}, [closeSidebar]);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<StudioNavbar />
			<div className="flex pt-14">
				<StudioSidebar />
				<main className="flex-1 md:ml-64 p-6 min-h-[calc(100vh-56px)] bg-background">{children}</main>
			</div>
		</div>
	);
};

export default StudioLayout;
