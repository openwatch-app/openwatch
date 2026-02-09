'use client';

import { ThumbsUp, ThumbsDown, Share2, MoreVertical, Loader2, Check, ListPlus } from 'lucide-react';
import { SaveToPlaylist } from '~app/components/playlists/save-to-playlist-dialog';
import { CommentSection } from '~app/components/comments/comment-section';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { UpNextOverlay } from '~components/video-player/up-next-overlay';
import { PlaylistSidebar } from '~app/components/watch/playlist-sidebar';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { VideoPlayer } from '~components/video-player/video-player';
import { SubscribeButton } from '~components/subscribe-button';
import { authClient } from '~lib/auth-client';
import { useEffect, useState } from 'react';
import { Button } from '~components/button';
import { useAppStore } from '~lib/store';
import { Video } from '~app/types';
import { cn } from '~lib/utils';
import Link from 'next/link';
import axios from 'axios';
import dayjs from 'dayjs';
import '~lib/dayjs-config';

const Page = () => {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	// Decode ID to handle special characters (like colons in external IDs)
	const id = decodeURIComponent((params.id as string) || '');
	const playlistId = searchParams.get('list');
	const { data: session } = authClient.useSession();

	const [video, setVideo] = useState<Video | null>(null);
	const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
	const [playlist, setPlaylist] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedTab, setSelectedTab] = useState<'all' | 'channel' | 'related'>('all');
	const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [showUpNext, setShowUpNext] = useState(false);
	const [nextVideo, setNextVideo] = useState<Video | null>(null);
	const { theaterMode, autoplay, setAutoplay } = useAppStore();

	const isOwner = session?.user?.id === video?.channel.id;

	const handleVideoEnded = () => {
		let next: Video | null = null;

		if (playlist && playlist.videos) {
			// Find current video index
			const currentIndex = playlist.videos.findIndex((v: any) => v.id === id);
			if (currentIndex !== -1 && currentIndex < playlist.videos.length - 1) {
				next = playlist.videos[currentIndex + 1];
			}
		} else if (recommendedVideos.length > 0) {
			// Get first recommended video that isn't from the same channel if possible?
			// Or just the first one as per YouTube logic (usually related)
			// The current filter logic in render might hide some, so we should pick from recommendedVideos directly
			// but we should probably respect the 'related' tab logic if we want to be consistent?
			// YouTube just picks the top recommendation.
			next = recommendedVideos[0];
		}

		if (next) {
			setNextVideo(next);
			setShowUpNext(true);
		}
	};

	const handlePlayNext = () => {
		if (!nextVideo) return;

		const url = playlist ? `/watch/${nextVideo.id}?list=${playlist.id}` : `/watch/${nextVideo.id}`;

		router.push(url);
		setShowUpNext(false);
	};

	const handleShare = async () => {
		try {
			const url = window.location.href;
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(url);
			} else {
				// Fallback for older browsers or non-secure contexts
				const textArea = document.createElement('textarea');
				textArea.value = url;
				textArea.style.position = 'fixed';
				textArea.style.left = '-9999px';
				textArea.style.top = '0';
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				try {
					document.execCommand('copy');
				} catch (err) {
					console.error('Fallback copy failed', err);
				}
				document.body.removeChild(textArea);
			}
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	};

	const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
		if (!session) {
			router.push('/auth');
			return;
		}

		if (!video || video.isExternal) return;

		// Optimistic update
		const previousVideo = { ...video };
		setVideo((prev) => {
			if (!prev) return null;

			let newLikes = parseInt(prev.likes || '0');
			let newDislikes = parseInt(prev.dislikes || '0');
			const currentReaction = prev.userReaction;

			if (currentReaction === type) {
				// Remove reaction
				if (type === 'LIKE') newLikes--;
				if (type === 'DISLIKE') newDislikes--;
				return { ...prev, likes: newLikes.toString(), dislikes: newDislikes.toString(), userReaction: null };
			} else {
				// Change or add reaction
				if (currentReaction === 'LIKE') newLikes--;
				if (currentReaction === 'DISLIKE') newDislikes--;

				if (type === 'LIKE') newLikes++;
				if (type === 'DISLIKE') newDislikes++;

				return { ...prev, likes: newLikes.toString(), dislikes: newDislikes.toString(), userReaction: type };
			}
		});

		try {
			await axios.post(`/api/videos/${id}/reaction`, { type });
		} catch (err) {
			console.error('Error updating reaction:', err);
			// Revert on error
			setVideo(previousVideo);
		}
	};

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				setShowUpNext(false);
				setNextVideo(null);
				const promises: Promise<any>[] = [axios.get(`/api/videos/${id}`), axios.get(`/api/videos/${id}/recommendations`)];

				if (playlistId) {
					promises.push(axios.get(`/api/playlists/${playlistId}`).catch(() => ({ data: null })));
				}

				const [videoResponse, recResponse, playlistResponse] = await Promise.all(promises);

				setVideo(videoResponse.data);
				setRecommendedVideos(recResponse.data);
				if (playlistResponse?.data && !playlistResponse.data.error) {
					setPlaylist(playlistResponse.data);
				}
			} catch (err: any) {
				console.error('Error fetching video data:', err);
				setError(err.response?.data?.error || 'Failed to load video');
			} finally {
				setLoading(false);
			}
		};

		if (id) {
			fetchData();
		}
	}, [id, playlistId]);

	const filteredRecommendations = recommendedVideos.filter((v) => {
		if (selectedTab === 'channel') {
			return v.channel.id === video?.channel.id;
		}
		if (selectedTab === 'related') {
			return v.channel.id !== video?.channel.id;
		}
		return true;
	});

	if (loading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !video) {
		return <div className="p-10 text-center text-orange-600">{error || 'Video not found'}</div>;
	}

	return (
		<div
			className={cn(
				'transition-all duration-300 ease-in-out',
				theaterMode ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6' : 'flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-6 p-0 lg:p-6 max-w-[1800px] mx-auto'
			)}
		>
			{/* Main Content Wrapper (Video + Info) */}
			<div className="contents">
				{/* Video Player */}
				<div
					className={cn(
						'relative group bg-black transition-all duration-300 ease-in-out z-20',
						theaterMode ? 'col-span-1 lg:col-span-2 w-full h-[72vh]' : 'aspect-video rounded-none lg:rounded-xl overflow-hidden mb-0 lg:mb-4 lg:col-start-1 lg:row-start-1'
					)}
				>
					<VideoPlayer
						videoId={id}
						videoUrl={video.videoUrl}
						autoPlay
						initialTime={video.savedProgress}
						onEnded={handleVideoEnded}
						showAutoplayToggle={true}
						autoplayEnabled={autoplay}
						onAutoplayChange={setAutoplay}
					>
						{showUpNext && nextVideo && <UpNextOverlay nextVideo={nextVideo} autoPlayEnabled={autoplay} onCancel={() => setShowUpNext(false)} onPlayNow={handlePlayNext} />}
					</VideoPlayer>
				</div>

				<div
					className={cn(
						'transition-all duration-300 ease-in-out',
						theaterMode ? 'col-span-1 pl-6 pb-6 mt-6 max-w-[1280px] lg:justify-self-end w-full' : 'p-4 lg:p-0 lg:col-start-1 lg:row-start-2'
					)}
				>
					{/* Title */}
					<h1 className="text-xl font-bold mb-2">{video.title}</h1>

					{/* Channel & Actions */}
					<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
						<div className="flex items-center gap-3 flex-1 min-w-0">
							<Link href={`/channel/${video.channel.handle || video.channel.id}`}>
								<Avatar className="h-10 w-10 shrink-0 cursor-pointer">
									<AvatarImage src={video.channel.avatar} />
									<AvatarFallback>{video.channel.name[0]}</AvatarFallback>
								</Avatar>
							</Link>
							<div className="min-w-0 flex-1 sm:flex-initial">
								<Link href={`/channel/${video.channel.handle || video.channel.id}`}>
									<h3 className="font-semibold cursor-pointer hover:text-foreground/80 truncate">{video.channel.name}</h3>
								</Link>
								<p className="text-xs text-muted-foreground truncate">{video.channel.subscribers} subscribers</p>
							</div>
							{!isOwner && (
								<SubscribeButton
									channelId={video.channel.id}
									initialIsSubscribed={video.channel.isSubscribed}
									initialNotify={video.channel.notify}
									className="shrink-0"
									onSubscriptionChange={(subscribed) => {
										setVideo((prev) => {
											if (!prev) return null;
											let currentCount = parseInt(prev.channel.subscribers || '0', 10);
											if (isNaN(currentCount)) currentCount = 0;
											const newCount = subscribed ? currentCount + 1 : Math.max(0, currentCount - 1);

											return {
												...prev,
												channel: {
													...prev.channel,
													isSubscribed: subscribed,
													subscribers: newCount.toString()
												}
											};
										});
									}}
								/>
							)}
						</div>

						<div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto">
							<div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
								<div className="flex items-center bg-secondary rounded-full">
									<Button
										variant="ghost"
										disabled={video.isExternal}
										className={cn(
											'rounded-r-none px-4 border-r border-white/20 gap-2 hover:bg-secondary/80',
											video.userReaction === 'LIKE' && 'text-primary',
											video.isExternal && 'cursor-not-allowed opacity-70'
										)}
										onClick={() => handleReaction('LIKE')}
										title={video.isExternal ? 'Likes from original instance (interactions disabled)' : undefined}
									>
										<ThumbsUp className={cn('h-4 w-4', video.userReaction === 'LIKE' && 'fill-current')} />
										<span>{video.likes || '0'}</span>
									</Button>
									<Button
										variant="ghost"
										disabled={video.isExternal}
										className={cn(
											'rounded-r-full px-4 hover:bg-secondary/80 gap-2',
											video.userReaction === 'DISLIKE' && 'text-primary',
											video.isExternal && 'cursor-not-allowed opacity-70'
										)}
										onClick={() => handleReaction('DISLIKE')}
										title={video.isExternal ? 'Dislikes from original instance (interactions disabled)' : undefined}
									>
										<ThumbsDown className={cn('h-4 w-4', video.userReaction === 'DISLIKE' && 'fill-current')} />
										<span>{video.dislikes || '0'}</span>
									</Button>
								</div>

								<Button variant="secondary" className="rounded-full gap-2" onClick={handleShare}>
									{isCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
									<span>{isCopied ? 'Copied' : 'Share'}</span>
								</Button>

								<SaveToPlaylist videoId={id}>
									<Button variant="secondary" className="rounded-full gap-2">
										<ListPlus className="h-4 w-4" />
										<span>Save</span>
									</Button>
								</SaveToPlaylist>
							</div>
						</div>
					</div>

					{/* Description */}
					<div
						className={cn('bg-secondary/50 rounded-xl p-3 text-sm mb-6 hover:bg-secondary/70 transition-colors relative', !isDescriptionExpanded && 'cursor-pointer')}
						onClick={() => !isDescriptionExpanded && setIsDescriptionExpanded(true)}
					>
						<div className="font-medium mb-1 flex items-center gap-2">
							<span>{video.views} views</span>
							<span>•</span>
							<span>{dayjs(video.uploadedAt).fromNow()}</span>
						</div>
						<div className="whitespace-pre-wrap text-muted-foreground">
							{isDescriptionExpanded
								? video.description || 'No description provided.'
								: (video.description?.slice(0, 10) || 'No description provided.') + (video.description && video.description.length > 150 ? '...' : '')}
						</div>
						{video.description && video.description.length > 10 && (
							<div
								className="mt-2 font-medium cursor-pointer w-fit"
								onClick={(e) => {
									e.stopPropagation();
									setIsDescriptionExpanded(!isDescriptionExpanded);
								}}
							>
								{isDescriptionExpanded ? 'Show less' : '...more'}
							</div>
						)}
					</div>

					{/* Comments Section */}
					<CommentSection videoId={id} videoOwnerId={video.channel.id} currentUserId={session?.user?.id} />
				</div>
			</div>

			{/* Sidebar Recommendations */}
			<div
				className={cn(
					'shrink-0 p-4 lg:p-0 transition-all duration-300 ease-in-out',
					theaterMode ? 'col-span-1 pr-6 pb-6 mt-6 w-full lg:w-[400px] justify-self-start' : 'lg:w-[400px] lg:col-start-2 lg:row-start-1 lg:row-span-2'
				)}
			>
				{playlist && (
					<div className="mb-4">
						<PlaylistSidebar
							playlist={playlist}
							currentVideoId={id}
							onClose={() => {
								const newParams = new URLSearchParams(searchParams.toString());
								newParams.delete('list');
								const qs = newParams.toString();
								router.push(qs ? `/watch/${id}?${qs}` : `/watch/${id}`);
								setPlaylist(null);
							}}
						/>
					</div>
				)}

				{!playlist && (
					<div className="flex flex-col gap-4 mb-4">
						<div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
							<Button
								variant={selectedTab === 'all' ? 'default' : 'secondary'}
								size="sm"
								className={cn('rounded-lg whitespace-nowrap', selectedTab === 'all' ? 'bg-foreground text-background hover:bg-foreground/90' : '')}
								onClick={() => setSelectedTab('all')}
							>
								All
							</Button>
							<Button
								variant={selectedTab === 'channel' ? 'default' : 'secondary'}
								size="sm"
								className={cn('rounded-lg whitespace-nowrap', selectedTab === 'channel' ? 'bg-foreground text-background hover:bg-foreground/90' : '')}
								onClick={() => setSelectedTab('channel')}
							>
								From {video.channel.name}
							</Button>
							<Button
								variant={selectedTab === 'related' ? 'default' : 'secondary'}
								size="sm"
								className={cn('rounded-lg whitespace-nowrap', selectedTab === 'related' ? 'bg-foreground text-background hover:bg-foreground/90' : '')}
								onClick={() => setSelectedTab('related')}
							>
								Related
							</Button>
						</div>
					</div>
				)}

				<div className="space-y-3">
					{filteredRecommendations.map((recVideo) => (
						<div key={recVideo.id} className="flex gap-2 group cursor-pointer" onClick={() => router.push(`/watch/${recVideo.id}`)}>
							<div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0">
								<img src={recVideo.thumbnail} alt={recVideo.title} className="object-cover w-full h-full" />
								<div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded font-medium">{recVideo.duration}</div>
							</div>
							<div className="flex-1 min-w-0">
								<h4 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">{recVideo.title}</h4>
								<div className="text-xs text-muted-foreground">
									<div>{recVideo.channel.name}</div>
									<div>
										{recVideo.views} views • {dayjs(recVideo.uploadedAt).fromNow()}
									</div>
								</div>
							</div>
							<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 self-start -mt-1">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default Page;
