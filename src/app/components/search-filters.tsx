'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '~components/button';
import { useTranslation } from '~lib/i18n';
import { cn } from '~lib/utils';

const SearchFilters = () => {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const router = useRouter();
	const currentType = searchParams.get('type') || 'all';

	const filters = [
		{ id: 'all', label: t('search.filters.all') },
		{ id: 'short', label: t('common.shorts') },
		{ id: 'video', label: t('search.filters.videos') },
		{ id: 'channel', label: t('search.filters.channels') },
		{ id: 'playlist', label: t('search.filters.playlists') }
	];

	const handleTypeChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value === 'all') {
			params.delete('type');
		} else {
			params.set('type', value);
		}
		router.push(`/results?${params.toString()}`);
	};

	return (
		<div className="w-full border-b border-transparent pb-2">
			<div className="w-full max-w-[calc(100vw-2rem)] overflow-x-auto scrollbar-hide">
				<div className="flex w-max space-x-3 p-1">
					{filters.map((filter) => (
						<Button
							key={filter.id}
							variant={currentType === filter.id ? 'default' : 'secondary'}
							className={cn(
								'rounded-lg px-3 py-1 h-8 text-sm font-medium transition-colors',
								currentType === filter.id ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-secondary hover:bg-secondary/80 text-foreground'
							)}
							onClick={() => handleTypeChange(filter.id)}
						>
							{filter.label}
						</Button>
					))}
				</div>
			</div>
		</div>
	);
};

export default SearchFilters;
