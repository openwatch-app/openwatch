'use client';

import { ThumbsUp, ThumbsDown, Share2, ListPlus, MoreVertical, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { VideoPlayer } from '~components/video-player/video-player';
import { useRouter, useParams } from 'next/navigation';
import { authClient } from '~lib/auth-client';
import { useEffect, useState } from 'react';
import { Video, Comment } from '~app/types';
import { Button } from '~components/button';
import { Input } from '~components/input';
import { cn } from '~lib/utils';
import axios from 'axios';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

import { CommentSection } from '~app/components/comments/comment-section';

const Page = () => {
	const router = useRouter();
	const params = useParams();
	const id = params.id as string;
	const { data: session } = authClient.useSession();

	const currentUser = session?.user || {
		id: 'guest',
		name: 'Guest',
		image: '',
		handle: 'guest'
	};

	const [video, setVideo] = useState<Video | null>(null);
	const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isSubscribing, setIsSubscribing] = useState(false);
	const [selectedTab, setSelectedTab] = useState<'all' | 'channel' | 'related'>('all');
	const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

	const isOwner = session?.user?.id === video?.channel.id;

	const handleSubscribe = async () => {
		if (!session) {
			router.push('/auth');
			return;
		}

		if (!video || isOwner) return;

		try {
			setIsSubscribing(true);
			const response = await axios.post('/api/channel/subscribe', {
				channelId: video.channel.id
			});

			setVideo((prev) => {
				if (!prev) return null;
				const isSubscribed = response.data.subscribed;
				const currentCount = parseInt(prev.channel.subscribers || '0');
				const newCount = isSubscribed ? currentCount + 1 : Math.max(0, currentCount - 1);

				return {
					...prev,
					channel: {
						...prev.channel,
						isSubscribed,
						subscribers: newCount.toString()
					}
				};
			});
		} catch (err) {
			console.error('Error toggling subscription:', err);
		} finally {
			setIsSubscribing(false);
		}
	};

	const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
		if (!session) {
			router.push('/auth');
			return;
		}

		if (!video) return;

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
				const [videoResponse, recResponse] = await Promise.all([axios.get(`/api/videos/${id}`), axios.get(`/api/videos/${id}/recommendations`)]);
				setVideo(videoResponse.data);
				setRecommendedVideos(recResponse.data);
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
	}, [id]);

	const filteredRecommendations = recommendedVideos.filter((v) => {
		if (selectedTab === 'channel') {
			return v.channel.id === video?.channel.id;
		}
		if (selectedTab === 'related') {
			// In a real app, 'related' might be a specific API call.
			// Here, the default list IS related, but maybe we want to exclude same-channel videos for variety?
			// Or just keep it as 'all' for now since 'All' and 'Related' are often similar in this context.
			// Let's make 'Related' exclude same-channel videos to differentiate it from 'From Channel'.
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
		<div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1800px] mx-auto">
			{/* Main Content */}
			<div className="flex-1 min-w-0">
				{/* Video Player */}
				<div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 relative group">
					<VideoPlayer videoId={id} videoUrl={video.videoUrl} autoPlay />
				</div>

				{/* Title */}
				<h1 className="text-xl font-bold mb-2">{video.title}</h1>

				{/* Channel & Actions */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
					<div className="flex items-center gap-3">
						<Avatar className="h-10 w-10 cursor-pointer" onClick={() => router.push(`/channel/${video.channel.handle || video.channel.id}`)}>
							<AvatarImage src={video.channel.avatar} />
							<AvatarFallback>{video.channel.name[0]}</AvatarFallback>
						</Avatar>
						<div>
							<h3 className="font-semibold cursor-pointer hover:text-foreground/80" onClick={() => router.push(`/channel/${video.channel.handle || video.channel.id}`)}>
								{video.channel.name}
							</h3>
							<p className="text-xs text-muted-foreground">{video.channel.subscribers} subscribers</p>
						</div>
						{!isOwner && (
							<Button
								className={cn(
									'ml-4 rounded-full font-medium transition-colors',
									video.channel.isSubscribed ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-foreground text-background hover:bg-foreground/90'
								)}
								onClick={handleSubscribe}
								disabled={isSubscribing}
							>
								{isSubscribing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
								{video.channel.isSubscribed ? 'Subscribed' : 'Subscribe'}
							</Button>
						)}
					</div>

					<div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
						<div className="flex items-center bg-secondary rounded-full">
							<Button
								variant="ghost"
								className={cn('rounded-l-full px-4 border-r border-border/50 gap-2 hover:bg-secondary/80', video.userReaction === 'LIKE' && 'text-primary')}
								onClick={() => handleReaction('LIKE')}
							>
								<ThumbsUp className={cn('h-4 w-4', video.userReaction === 'LIKE' && 'fill-current')} />
								<span>{video.likes || 'Like'}</span>
							</Button>
							<Button
								variant="ghost"
								className={cn('rounded-r-full px-4 hover:bg-secondary/80 gap-2', video.userReaction === 'DISLIKE' && 'text-primary')}
								onClick={() => handleReaction('DISLIKE')}
							>
								<ThumbsDown className={cn('h-4 w-4', video.userReaction === 'DISLIKE' && 'fill-current')} />
								{video.dislikes && parseInt(video.dislikes) > 0 && <span>{video.dislikes}</span>}
							</Button>
						</div>

						<Button variant="secondary" className="rounded-full gap-2">
							<Share2 className="h-4 w-4" />
							<span>Share</span>
						</Button>
					</div>
				</div>

				{/* Description */}
				<div
					className={cn('bg-secondary/50 rounded-xl p-3 text-sm mb-6 hover:bg-secondary/70 transition-colors relative', !isDescriptionExpanded && 'cursor-pointer')}
					onClick={() => !isDescriptionExpanded && setIsDescriptionExpanded(true)}
				>
					<div className="font-medium mb-1">
						{video.views} views • {dayjs(video.uploadedAt).fromNow()}
					</div>
					<div className="whitespace-pre-wrap text-muted-foreground">
						{isDescriptionExpanded
							? video.description || 'No description provided.'
							: (video.description?.slice(0, 150) || 'No description provided.') + (video.description && video.description.length > 150 ? '...' : '')}
					</div>
					{video.description && video.description.length > 150 && (
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

			{/* Sidebar Recommendations */}
			<div className="lg:w-[400px] shrink-0">
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
