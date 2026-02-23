'use client';

import { Smile } from 'lucide-react';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '~components/popover';
import { Button } from '~components/button';
import { useTheme } from 'next-themes';

interface EmojiPickerProps {
	onEmojiClick: (emoji: string) => void;
	trigger?: React.ReactNode;
}

export const EmojiPicker = ({ onEmojiClick, trigger }: EmojiPickerProps) => {
	const { resolvedTheme } = useTheme();

	return (
		<Popover>
			<PopoverTrigger asChild>
				{trigger || (
					<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
						<Smile className="h-5 w-5" />
					</Button>
				)}
			</PopoverTrigger>
			<PopoverContent side="top" align="start" className="w-auto p-0 border-none bg-transparent shadow-none">
				<EmojiPickerReact
					onEmojiClick={(data) => onEmojiClick(data.emoji)}
					theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
					lazyLoadEmojis={true}
				/>
			</PopoverContent>
		</Popover>
	);
};
