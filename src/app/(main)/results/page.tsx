'use client';

import PlaylistResultCard from '~components/playlist-result-card';
import ChannelResultCard from '~components/channel-result-card';
import SearchResultCard from '~components/search-result-card';
import SearchFilters from '~components/search-filters';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Video, Channel } from '~app/types';
import { useTranslation } from '~lib/i18n';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import axios from 'axios';

const Content = () => {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const query = searchParams.get('query');
	const source = searchParams.get('source') || 'local';
	const type = searchParams.get('type') || 'all';
	const [results, setResults] = useState<(Video | Channel | any)[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchResults = async () => {
			if (!query) {
				setResults([]);
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const response = await axios.get('/api/videos/search', {
					params: { query, source, type }
				});
				setResults(response.data);
			} catch (error) {
				console.error('Error fetching search results:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchResults();
	}, [query, source, type]);

	return (
		<div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto w-full">
			<SearchFilters />
			{loading ? (
				<div className="flex h-[50vh] items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : results.length === 0 ? (
				<div className="text-center py-20">
					<p className="text-muted-foreground">
						{t('search.no_results')} "{query}"
					</p>
				</div>
			) : (
				results.map((item) => {
					if (item.type === 'channel') {
						return <ChannelResultCard key={item.id} channel={item as Channel} />;
					}
					if (item.type === 'playlist') {
						return <PlaylistResultCard key={item.id} playlist={item} />;
					}
					return <SearchResultCard key={item.id} video={item as Video} />;
				})
			)}
		</div>
	);
};

const Page = () => {
	const { t } = useTranslation();
	return (
		<Suspense fallback={<div>{t('search.loading')}</div>}>
			<Content />
		</Suspense>
	);
};

export default Page;
