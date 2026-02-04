'use client';

import { ScrollArea, ScrollBar } from '~components/scroll-area';
import VideoCard from '~components/video-card';
import { Video, Category } from '~app/types';
import { useEffect, useState } from 'react';
import { Button } from '~components/button';
import { cn } from '~lib/utils';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const Page = () => {
	const [videos, setVideos] = useState<Video[]>([]);
	const [categories, setCategories] = useState<Category[]>([
		{ id: 'all', name: 'All' },
		{ id: 'recently-uploaded', name: 'Recently uploaded' },
		{ id: 'watched', name: 'Watched' }
	]);
	const [selectedCategory, setSelectedCategory] = useState('all');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchVideos = async () => {
			try {
				setLoading(true);
				const response = await axios.get('/api/videos/feed', {
					params: { filter: selectedCategory }
				});
				setVideos(response.data);
			} catch (error) {
				console.error('Error fetching videos:', error);
			} finally {
				setLoading(false);
			}
		};
		fetchVideos();
	}, [selectedCategory]);

	if (loading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Categories */}
			<div className="sticky top-14 bg-background z-30 pt-3 pb-3 px-4 w-full border-b border-transparent">
				<ScrollArea className="w-full whitespace-nowrap">
					<div className="flex w-max space-x-3 p-1">
						{categories.map((category) => (
							<Button
								key={category.id}
								variant={selectedCategory === category.id ? 'default' : 'secondary'}
								className={cn(
									'rounded-lg px-3 py-1 h-8 text-sm font-medium transition-colors',
									selectedCategory === category.id ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-secondary hover:bg-secondary/80 text-foreground'
								)}
								onClick={() => setSelectedCategory(category.id)}
							>
								{category.name}
							</Button>
						))}
					</div>
					<ScrollBar orientation="horizontal" className="invisible" />
				</ScrollArea>
			</div>

			{/* Video Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-5 gap-y-20 px-3 py-3">
				{videos.map((video) => (
					<VideoCard key={video.id} video={video} />
				))}
			</div>

			{videos.length === 0 && (
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<p className="text-lg">No videos found</p>
					<p className="text-sm">Try searching for something else</p>
				</div>
			)}
		</div>
	);
};

export default Page;
