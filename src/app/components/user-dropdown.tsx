'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu';
import { LogOut, PlaySquare, Shield, Moon, Sun } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { authClient } from '~lib/auth-client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';

interface UserDropdownProps {
	user: { id: string; name: string; image?: string | null; handle?: string | null };
}

const UserDropdown = ({ user }: UserDropdownProps) => {
	const router = useRouter();
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const userImage = user.image || '';

	useEffect(() => {
		setMounted(true);
	}, []);

	const handleSignOut = async () => {
		await authClient.signOut();
		router.refresh();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar className="h-8 w-8 cursor-pointer">
					<AvatarImage src={userImage} alt={user.name} />
					<AvatarFallback>{user.name?.[0]}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72 p-0 bg-popover border border-border text-popover-foreground shadow-2xl rounded-xl overflow-hidden py-2">
				<div className="flex gap-4 px-4 py-2">
					<Avatar className="h-10 w-10 shrink-0">
						<AvatarImage src={userImage} alt={user.name} />
						<AvatarFallback>{user.name?.[0]}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col overflow-hidden">
						<span className="text-[16px] font-normal truncate leading-tight">{user.name}</span>
						<Link href={`/channel/${user.handle || user.id}`} className="text-[14px] text-blue-600 dark:text-[#3ea6ff] hover:underline">
							View your channel
						</Link>
					</div>
				</div>

				<DropdownMenuSeparator className="my-2 h-px" />

				<div className="py-0">
					{(user as any).role === 'admin' && (
						<Link href="/console">
							<DropdownMenuItem className="px-4 py-2.5 cursor-pointer gap-4 rounded-none outline-none border-none focus:bg-accent focus:text-accent-foreground">
								<Shield className="h-6 w-6 stroke-[1.5]" />
								<span className="text-[14px] font-normal flex-1">Console</span>
							</DropdownMenuItem>
						</Link>
					)}

					<Link href="/studio">
						<DropdownMenuItem className="px-4 py-2.5 cursor-pointer gap-4 rounded-none outline-none border-none focus:bg-accent focus:text-accent-foreground">
							<PlaySquare className="h-6 w-6 stroke-[1.5]" />
							<span className="text-[14px] font-normal flex-1">Studio</span>
						</DropdownMenuItem>
					</Link>

					{mounted && (
						<DropdownMenuItem
							onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
							className="px-4 py-2.5 cursor-pointer gap-4 rounded-none outline-none border-none focus:bg-accent focus:text-accent-foreground"
						>
							{resolvedTheme === 'dark' || (resolvedTheme == null && theme === 'dark') ? <Sun className="h-6 w-6 stroke-[1.5]" /> : <Moon className="h-6 w-6 stroke-[1.5]" />}
							<span className="text-[14px] font-normal flex-1">Appearance: {resolvedTheme === 'dark' || (resolvedTheme == null && theme === 'dark') ? 'Dark' : 'Light'}</span>
						</DropdownMenuItem>
					)}

					<DropdownMenuItem onClick={handleSignOut} className="px-4 py-2.5 cursor-pointer gap-4 rounded-none outline-none border-none focus:bg-accent focus:text-accent-foreground">
						<LogOut className="h-6 w-6 stroke-[1.5]" />
						<span className="text-[14px] font-normal flex-1">Sign out</span>
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default UserDropdown;
