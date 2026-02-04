'use client';

import { authClient } from '~lib/auth-client';
import { Menu, Shield } from 'lucide-react';
import UserDropdown from './user-dropdown';
import { useAppStore } from '~lib/store';
import { Button } from './button';
import { Badge } from './badge';
import Link from 'next/link';

const ConsoleNavbar = () => {
	const { data: session } = authClient.useSession();
	const { toggleSidebar } = useAppStore();

	const currentUser = session?.user;

	return (
		<nav className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-50 flex items-center justify-between px-4">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 md:hidden">
					<Menu className="h-5 w-5" />
				</Button>
				<Link href="/" className="flex items-center gap-1">
					<div className="bg-orange-600 text-white p-1 rounded-lg">
						<Shield className="h-4 w-4 fill-current" />
					</div>
					<span className="text-xl font-bold tracking-tighter">Console</span>
					<Badge variant="secondary" className="text-[10px] px-1.5 h-5 rounded-full uppercase">
						beta
					</Badge>
				</Link>
			</div>

			{currentUser && <UserDropdown user={currentUser} />}
		</nav>
	);
};

export default ConsoleNavbar;
