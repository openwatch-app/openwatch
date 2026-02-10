'use client';

import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from './dropdown-menu';
import { Languages, Check } from 'lucide-react';
import { useTranslation } from '~lib/i18n';

const languages = [
	{ code: 'en', name: 'English' },
	{ code: 'ro', name: 'Română' }
];

export const LanguageSwitcherItem = () => {
	const { t, language, setLanguage } = useTranslation();

	const currentLanguageName = languages.find((l) => l.code === language)?.name || 'English';

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger className="px-4 py-2.5 cursor-pointer gap-4 rounded-none outline-none border-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent">
				<Languages className="h-6 w-6 stroke-[1.5]" />
				<span className="text-[14px] font-normal flex-1">
					{t('common.language')}: {currentLanguageName}
				</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent className="w-48 p-0 bg-popover border border-border text-popover-foreground shadow-2xl rounded-xl overflow-hidden py-2">
				{languages.map((lang) => (
					<DropdownMenuItem
						key={lang.code}
						onClick={() => setLanguage(lang.code)}
						className="px-4 py-2.5 cursor-pointer gap-4 rounded-none outline-none border-none focus:bg-accent focus:text-accent-foreground"
					>
						<span className="text-[14px] font-normal flex-1">{lang.name}</span>
						{language === lang.code && <Check className="h-4 w-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	);
};

export default LanguageSwitcherItem;
