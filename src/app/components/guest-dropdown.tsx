'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { MoreVertical, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from './button';

const GuestDropdown = () => {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="rounded-full">
					<MoreVertical className="h-5 w-5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56 p-0 bg-popover border border-border text-popover-foreground shadow-2xl rounded-xl overflow-hidden py-2">
				<DropdownMenuItem
					onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
					className="px-4 py-2.5 cursor-pointer gap-4 rounded-none outline-none border-none focus:bg-accent focus:text-accent-foreground"
				>
					{theme === 'dark' ? (
						<Sun className="h-5 w-5 stroke-[1.5]" />
					) : (
						<Moon className="h-5 w-5 stroke-[1.5]" />
					)}
					<span className="text-[14px] font-normal flex-1">
						Appearance: {theme === 'dark' ? 'Dark' : 'Light'}
					</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default GuestDropdown;
