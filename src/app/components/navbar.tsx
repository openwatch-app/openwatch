'use client';

import { NotificationCenter } from '~components/notification-center';
import { Menu, Search, Video, User } from 'lucide-react';
import { authClient } from '~lib/auth-client';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../lib/store';
import UserDropdown from './user-dropdown';
import { Button } from './button';
import { Badge } from './badge';
import { useState } from 'react';
import { Input } from './input';
import Link from 'next/link';

const Navbar = () => {
	const { toggleSidebar } = useAppStore();
	const { data: session } = authClient.useSession();
	const [searchInput, setSearchInput] = useState('');
	const router = useRouter();

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchInput.trim()) {
			router.push(`/results?query=${encodeURIComponent(searchInput)}`);
		}
	};

	return (
		<nav className="fixed top-0 left-0 right-0 h-14 bg-background z-50 flex items-center justify-between px-4">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
					<Menu className="h-5 w-5" />
				</Button>
				<Link href="/" className="flex items-center gap-1">
					<div className="bg-primary text-white p-1 rounded-lg">
						<Video className="h-4 w-4 fill-current" />
					</div>
					<span className="text-xl font-bold tracking-tighter">OpenWatch</span>
					<Badge variant="secondary" className="text-[10px] px-1.5 h-5 rounded-full uppercase">
						beta
					</Badge>
				</Link>
			</div>

			<form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-2xl mx-4">
				<div className="flex w-full items-center ml-10">
					<Input
						placeholder="Search"
						className="rounded-l-full rounded-r-none focus-visible:ring-0 border-r-0 shadow-none pl-4"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
					/>
					<Button type="submit" variant="secondary" className="rounded-r-full rounded-l-none border border-l-0 px-5 bg-secondary/50 hover:bg-secondary/70 shadow-none">
						<Search className="h-4 w-4" />
					</Button>
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

export default Navbar;
