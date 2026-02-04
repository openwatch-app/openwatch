'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { LogOut, PlaySquare, Shield } from 'lucide-react';
import { authClient } from '~lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserDropdownProps {
	user: { id: string; name: string; image?: string | null; handle?: string | null };
}

const UserDropdown = ({ user }: UserDropdownProps) => {
	const router = useRouter();
	const userImage = user.image || '';

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
			<DropdownMenuContent align="end" className="w-72 p-0 bg-[#282828] border-none text-white shadow-2xl rounded-xl overflow-hidden py-2">
				<div className="flex gap-4 px-4 py-2">
					<Avatar className="h-10 w-10 shrink-0">
						<AvatarImage src={userImage} alt={user.name} />
						<AvatarFallback>{user.name?.[0]}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col overflow-hidden">
						<span className="text-[16px] font-normal truncate leading-tight">{user.name}</span>
						<Link href={`/channel/${user.handle || user.id}`} className="text-[14px] text-[#3ea6ff] hover:underline">
							View your channel
						</Link>
					</div>
				</div>

				<DropdownMenuSeparator className="bg-white/10 my-2 h-[1px]" />

				<div className="py-0">
					{(user as any).role === 'admin' && (
						<Link href="/console">
							<DropdownMenuItem className="px-4 py-2.5 hover:bg-white/10 focus:bg-white/10 cursor-pointer gap-4 rounded-none outline-none border-none">
								<Shield className="h-6 w-6 stroke-[1.5]" />
								<span className="text-[14px] font-normal flex-1">Console</span>
							</DropdownMenuItem>
						</Link>
					)}

					<Link href="/studio">
						<DropdownMenuItem className="px-4 py-2.5 hover:bg-white/10 focus:bg-white/10 cursor-pointer gap-4 rounded-none outline-none border-none">
							<PlaySquare className="h-6 w-6 stroke-[1.5]" />
							<span className="text-[14px] font-normal flex-1">Studio</span>
						</DropdownMenuItem>
					</Link>

					<DropdownMenuItem onClick={handleSignOut} className="px-4 py-2.5 hover:bg-white/10 focus:bg-white/10 cursor-pointer gap-4 rounded-none outline-none border-none">
						<LogOut className="h-6 w-6 stroke-[1.5]" />
						<span className="text-[14px] font-normal flex-1">Sign out</span>
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default UserDropdown;
