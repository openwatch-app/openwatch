'use client';

import { Search, Trash2, PauseCircle, PlayCircle, MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '~components/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '~components/input';
import { Video } from '~app/types';
import axios from 'axios';

const Page = () => {
	const [videos, setVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [isPaused, setIsPaused] = useState(false);
	const [clearing, setClearing] = useState(false);
	const router = useRouter();

	useEffect(() => {
		fetchHistory();
		fetchPauseStatus();
	}, []);

	const fetchHistory = async () => {
		try {
			setLoading(true);
			const res = await axios.get('/api/videos/feed?filter=watched');
			setVideos(res.data);
		} catch (error) {
			console.error('Failed to fetch history', error);
		} finally {
			setLoading(false);
		}
	};

	const fetchPauseStatus = async () => {
		try {
			const res = await axios.get('/api/history/pause');
			setIsPaused(res.data.isHistoryPaused);
		} catch (error) {
			console.error('Failed to fetch pause status', error);
		}
	};

	const handleClearHistory = async () => {
		if (!confirm('Are you sure you want to clear your watch history?')) return;
		try {
			setClearing(true);
			await axios.delete('/api/history/clear');
			setVideos([]);
		} catch (error) {
			console.error('Failed to clear history', error);
		} finally {
			setClearing(false);
		}
	};

	const handleTogglePause = async () => {
		try {
			const newStatus = !isPaused;
			await axios.post('/api/history/pause', { paused: newStatus });
			setIsPaused(newStatus);
		} catch (error) {
			console.error('Failed to toggle pause', error);
		}
	};

	const filteredVideos = videos.filter((v) => v.title.toLowerCase().includes(searchQuery.toLowerCase()) || (v.channel?.name && v.channel.name.toLowerCase().includes(searchQuery.toLowerCase())));

	return (
		<div className="flex flex-col md:flex-row gap-8 p-6 max-w-[1600px] mx-auto min-h-screen">
			{/* Left: Video List */}
			<div className="flex-1">
				<h1 className="text-2xl font-bold mb-6">Watch history</h1>

				{loading ? (
					<div className="flex justify-center py-10">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : filteredVideos.length === 0 ? (
					<div className="text-muted-foreground text-center py-10">{searchQuery ? 'No videos found matching your search.' : 'No watch history yet.'}</div>
				) : (
					<div className="space-y-4">
						{filteredVideos.map((video) => (
							<div key={video.id} className="flex gap-4 group cursor-pointer hover:bg-secondary/20 p-2 rounded-lg transition-colors" onClick={() => router.push(`/watch/${video.id}`)}>
								{/* Thumbnail */}
								<div className="relative w-40 sm:w-60 aspect-video rounded-xl overflow-hidden shrink-0">
									<img src={video.thumbnail} alt={video.title} className="object-cover w-full h-full" />
									<div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded font-medium">{video.duration}</div>
									{/* Progress Bar Mockup */}
									<div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
										<div className="h-full bg-orange-600 w-[80%]"></div>
									</div>
								</div>

								{/* Info */}
								<div className="flex-1 min-w-0 flex flex-col justify-start pt-1">
									<div className="flex justify-between items-start">
										<h3 className="font-semibold text-lg leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">{video.title}</h3>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 opacity-0 group-hover:opacity-100 -mr-2"
											onClick={(e) => {
												e.stopPropagation(); /* Menu logic */
											}}
										>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</div>
									<div className="text-sm text-muted-foreground mb-1">
										<span
											className="hover:text-foreground transition-colors"
											onClick={(e) => {
												e.stopPropagation();
												router.push(`/channel/${video.channel.handle || video.channel.id}`);
											}}
										>
											{video.channel.name}
										</span>
										<span className="mx-1">•</span>
										<span>{video.views} views</span>
									</div>
									<p className="text-xs text-muted-foreground line-clamp-2 hidden sm:block">{video.description}</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Right: Sidebar */}
			<div className="w-full md:w-80 shrink-0 space-y-6">
				<div className="relative">
					<Search className="absolute left-0 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search watch history"
						className="pl-8 pr-0 border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-primary bg-transparent dark:bg-transparent shadow-none h-auto py-2"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<div className="space-y-1">
					<Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground px-2" onClick={handleClearHistory} disabled={clearing || videos.length === 0}>
						<Trash2 className="mr-3 h-5 w-5" />
						Clear all watch history
					</Button>
					<Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground px-2" onClick={handleTogglePause}>
						{isPaused ? (
							<>
								<PlayCircle className="mr-3 h-5 w-5" />
								Turn on watch history
							</>
						) : (
							<>
								<PauseCircle className="mr-3 h-5 w-5" />
								Pause watch history
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default Page;
