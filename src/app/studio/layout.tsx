'use client';

import StudioSidebar from '~components/studio-sidebar';
import StudioNavbar from '~components/studio-navbar';
import { useAppStore } from '~lib/store';
import { useEffect } from 'react';
import '~lib/dayjs-config';
import { authClient } from '~lib/auth-client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const StudioLayout = ({ children }: { children: React.ReactNode }) => {
	const { closeSidebar } = useAppStore();
	const { data: session, isPending: isSessionLoading } = authClient.useSession();
	const router = useRouter();

	useEffect(() => {
		// Close sidebar on mobile by default
		if (window.innerWidth < 768) {
			closeSidebar();
		}
	}, [closeSidebar]);

	useEffect(() => {
		if (!isSessionLoading && !session) {
			router.push('/auth');
		}
	}, [session, isSessionLoading, router]);

	if (isSessionLoading || !session) {
		return (
			<div className="flex h-screen items-center justify-center bg-background text-foreground">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

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
