'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Video, Channel } from '~app/types';
import SearchResultCard from '~components/search-result-card';
import ChannelResultCard from '~components/channel-result-card';
import { Loader2 } from 'lucide-react';

const ResultsPage = () => {
	const searchParams = useSearchParams();
	const query = searchParams.get('query');
	const [results, setResults] = useState<(Video | Channel)[]>([]);
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
					params: { query }
				});
				setResults(response.data);
			} catch (error) {
				console.error('Error fetching search results:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchResults();
	}, [query]);

	if (loading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto w-full">
			{results.length === 0 ? (
				<div className="text-center py-20">
					<p className="text-muted-foreground">No results found for "{query}"</p>
				</div>
			) : (
				results.map((item) => {
					if (item.type === 'channel') {
						return <ChannelResultCard key={item.id} channel={item as Channel} />;
					}
					return <SearchResultCard key={item.id} video={item as Video} />;
				})
			)}
		</div>
	);
};

export default ResultsPage;
