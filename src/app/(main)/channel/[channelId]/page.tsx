'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Channel, Video } from '~app/types';
import { Button } from '~components/button';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~components/tabs';
import VideoCard from '~components/video-card';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '~lib/utils';
import { authClient } from '~lib/auth-client';
import Image from 'next/image';
import { SubscribeButton } from '~components/subscribe-button';

const ChannelPage = () => {
	const params = useParams();
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const channelId = params.channelId as string;

	const [channel, setChannel] = useState<Channel | null>(null);
	const [videos, setVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('videos');

	const isOwner = session?.user?.id === channel?.id;

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
									<Button
										className="rounded-full bg-secondary hover:bg-secondary/80 text-foreground font-medium h-9 px-4 text-sm"
										onClick={() => router.push('/studio/customization')}
									>
										Customize channel
									</Button>
									<Button className="rounded-full bg-secondary hover:bg-secondary/80 text-foreground font-medium h-9 px-4 text-sm" onClick={() => router.push('/studio')}>
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
				<div className="border-t border-border/40 mt-4 pt-6">
					<h2 className="text-lg font-bold mb-4">Videos</h2>
					<div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-10">
						{videos.map((video) => (
							<VideoCard key={video.id} video={video} />
						))}
					</div>
					{videos.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
							<p className="text-lg">No videos available</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ChannelPage;
