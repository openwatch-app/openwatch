'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Channel, Video } from '~app/types';
import { Button } from '~components/button';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~components/tabs';
import VideoCard from '~components/video-card';
import { Search, Loader2, MoreVertical } from 'lucide-react';
import { cn, normalizeViewCount, formatCompactNumber } from '~lib/utils';
import { authClient } from '~lib/auth-client';
import Image from 'next/image';
import { SubscribeButton } from '~components/subscribe-button';
import { PlaylistCard } from '~app/components/playlists/playlist-card';

const ChannelPage = () => {
	const params = useParams();
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const channelId = params.channelId as string;

	const [channel, setChannel] = useState<Channel | null>(null);
	const [videos, setVideos] = useState<Video[]>([]);
	const [playlists, setPlaylists] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('videos');

	const isOwner = session?.user?.id === channel?.id;

	const regularVideos = videos.filter((v) => !v.isShort && v.type !== 'short');
	const shortVideos = videos.filter((v) => v.isShort || v.type === 'short');

	useEffect(() => {
		const fetchChannelData = async () => {
			try {
				setLoading(true);
				// Fetch channel details
				const channelRes = await axios.get(`/api/channel/${channelId}`);
				setChannel(channelRes.data);

				// Fetch channel videos
				const videosRes = await axios.get(`/api/channel/${channelId}/videos`);
				setVideos(videosRes.data);

				// Fetch channel playlists
				const playlistsRes = await axios.get(`/api/channel/${channelId}/playlists`);
				setPlaylists(playlistsRes.data);
			} catch (error) {
				console.error('Error fetching channel data:', error);
			} finally {
				setLoading(false);
			}
		};

		if (channelId) {
			fetchChannelData();
		}
	}, [channelId]);

	if (loading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!channel) {
		return (
			<div className="flex flex-col h-[50vh] items-center justify-center gap-4">
				<p className="text-lg text-muted-foreground">Channel not found</p>
				<Button variant="outline" onClick={() => router.push('/')}>
					Go Home
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full min-h-screen bg-background">
			<div className="max-w-[1284px] mx-auto w-full px-10 sm:px-12 lg:px-16 pt-4">
				{/* Banner */}
				{channel.banner && (
					<div className="w-full aspect-6/1 min-h-[100px] max-h-[212px] relative overflow-hidden rounded-xl">
						<Image src={channel.banner} alt="Channel Banner" fill className="object-cover" priority />
					</div>
				)}

				{/* Header Section */}
				<div className="flex flex-col md:flex-row items-center md:items-start gap-6 py-8">
					{/* Avatar */}
					<div className="shrink-0">
						<Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-sm">
							<AvatarImage src={channel.avatar} />
							<AvatarFallback className="text-5xl">{channel.name[0]}</AvatarFallback>
						</Avatar>
					</div>

					{/* Channel Info */}
					<div className="flex flex-col flex-1 items-center md:items-start text-center md:text-left gap-2 min-w-0 pt-2">
						<h1 className="text-3xl font-bold">{channel.name}</h1>

						<div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 text-sm text-muted-foreground">
							<span className="font-medium text-foreground">{channel.handle}</span>
							<span>•</span>
							<span>{channel.subscribers} subscribers</span>
							<span>•</span>
							<span>{channel.videosCount} videos</span>
						</div>

						<div className="flex items-center gap-1 text-sm text-muted-foreground max-w-2xl cursor-pointer hover:text-foreground transition-colors">
							<p className="line-clamp-1">{channel.description || `More about this channel`}</p>
						</div>

						{/* Buttons */}
						<div className="flex flex-wrap gap-2 mt-3">
							{isOwner ? (
								<>
									<Button variant="secondary" className="font-medium" onClick={() => router.push('/studio/customization')}>
										Customize channel
									</Button>
									<Button variant="secondary" className="font-medium" onClick={() => router.push('/studio')}>
										Manage videos
									</Button>
								</>
							) : (
								<SubscribeButton
									channelId={channel.id}
									initialIsSubscribed={channel.isSubscribed}
									initialNotify={channel.notify}
									className="h-9"
									onSubscriptionChange={(subscribed) => {
										setChannel((prev) => {
											if (!prev) return null;
											const currentSubscribers = parseInt(prev.subscribers.replace(/,/g, '') || '0');
											const newSubCount = subscribed ? currentSubscribers + 1 : Math.max(0, currentSubscribers - 1);
											return {
												...prev,
												isSubscribed: subscribed,
												subscribers: newSubCount.toString()
											};
										});
									}}
								/>
							)}
						</div>
					</div>
				</div>

				{/* Videos Grid */}
				<div className="mt-4">
					<Tabs defaultValue="videos" value={activeTab} onValueChange={setActiveTab} className="w-full">
						<TabsList className="w-full justify-start border-b border-border/40 rounded-none h-auto p-0 bg-transparent gap-8">
							<TabsTrigger
								value="videos"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-0 py-3 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-colors text-sm tracking-wide"
							>
								Videos
							</TabsTrigger>
							<TabsTrigger
								value="shorts"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-0 py-3 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-colors text-sm tracking-wide"
							>
								Shorts
							</TabsTrigger>
							<TabsTrigger
								value="playlists"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-0 py-3 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-colors text-sm tracking-wide"
							>
								Playlists
							</TabsTrigger>
						</TabsList>

						<TabsContent value="videos" className="mt-6">
							<div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-10">
								{regularVideos.map((video) => (
									<VideoCard key={video.id} video={video} />
								))}
							</div>
							{regularVideos.length === 0 && (
								<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
									<p className="text-lg">No videos available</p>
								</div>
							)}
						</TabsContent>

						<TabsContent value="shorts" className="mt-6">
							<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 pb-10">
								{shortVideos.map((video) => (
									<div key={video.id} className="relative group">
										<a href={`/shorts/${video.id}`} className="block aspect-[9/16] relative rounded-xl overflow-hidden">
											<Image
												src={video.thumbnail || '/placeholder.jpg'}
												alt={video.title}
												fill
												className="object-cover transition-transform duration-300 group-hover:scale-105"
											/>
											<div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
										</a>
										<div className="mt-2 flex gap-x-2 items-start">
											<div className="flex-1 min-w-0">
												<a href={`/shorts/${video.id}`}>
													<h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors mb-1">{video.title}</h3>
												</a>
												<div className="text-xs text-muted-foreground">{formatCompactNumber(normalizeViewCount(video.views))} views</div>
											</div>
										</div>
									</div>
								))}
							</div>
							{shortVideos.length === 0 && (
								<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
									<p className="text-lg">No shorts available</p>
								</div>
							)}
						</TabsContent>

						<TabsContent value="playlists" className="mt-6">
							<div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-10">
								{playlists.map((playlist) => (
									<PlaylistCard key={playlist.id} playlist={playlist} />
								))}
							</div>
							{playlists.length === 0 && (
								<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
									<p className="text-lg">No playlists created</p>
								</div>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
};

export default ChannelPage;
