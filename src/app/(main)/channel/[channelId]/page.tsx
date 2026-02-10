'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '~components/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { PlaylistCard } from '~app/components/playlists/playlist-card';
import { normalizeViewCount, formatCompactNumber } from '~lib/utils';
import { SubscribeButton } from '~components/subscribe-button';
import { useParams, useRouter } from 'next/navigation';
import { authClient } from '~lib/auth-client';
import VideoCard from '~components/video-card';
import { Channel, Video } from '~app/types';
import { useEffect, useState } from 'react';
import { Button } from '~components/button';
import { useTranslation } from '~lib/i18n';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import axios from 'axios';

const ChannelPage = () => {
	const { t, language } = useTranslation();
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
				<p className="text-lg text-muted-foreground">{t('common.channel_not_found')}</p>
				<Button variant="outline" onClick={() => router.push('/')}>
					{t('common.go_home')}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full min-h-screen bg-background">
			<div className="max-w-[1284px] mx-auto w-full px-4 sm:px-12 lg:px-16 pt-4">
				{/* Banner */}
				{channel.banner && (
					<div className="w-full aspect-6/1 min-h-[100px] max-h-[212px] relative overflow-hidden rounded-xl">
						<Image src={channel.banner} alt="Channel Banner" fill className="object-cover" priority />
					</div>
				)}

				{/* Header Section */}
				<div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 py-6 md:py-8">
					{/* Avatar */}
					<div className="shrink-0">
						<Avatar className="h-20 w-20 md:h-40 md:w-40 border-4 border-background shadow-sm">
							<AvatarImage src={channel.avatar} />
							<AvatarFallback className="text-3xl md:text-5xl">{channel.name[0]}</AvatarFallback>
						</Avatar>
					</div>

					{/* Channel Info */}
					<div className="flex flex-col flex-1 items-center md:items-start text-center md:text-left gap-2 min-w-0 pt-2">
						<h1 className="text-2xl md:text-3xl font-bold">{channel.name}</h1>

						<div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 text-sm text-muted-foreground">
							<span className="font-medium text-foreground">{channel.handle}</span>
							{channel.isExternal && channel.host && (
								<>
									<span>•</span>
									<span className="text-xs bg-muted px-1.5 py-0.5 rounded">Source: {channel.host}</span>
								</>
							)}
							<span>•</span>
							<span className="lowercase">
								{channel.subscribers} {t('common.subscribers')}
							</span>
							<span>•</span>
							<span className="lowercase">
								{channel.videosCount} {t('common.videos')}
							</span>
						</div>

						<div className="flex items-center gap-1 text-sm text-muted-foreground max-w-2xl cursor-pointer hover:text-foreground transition-colors">
							<p className="line-clamp-1">{channel.description || t('common.more_about_channel')}</p>
						</div>

						{/* Buttons */}
						<div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3 w-full md:w-auto">
							{channel.isExternal ? (
								<Button disabled variant="secondary" className="h-9 opacity-70 cursor-not-allowed">
									{t('common.subscribing_disabled')}
								</Button>
							) : isOwner ? (
								<>
									<Button variant="secondary" className="font-medium flex-1 sm:flex-none" onClick={() => router.push('/studio/customization')}>
										{t('common.customize_channel')}
									</Button>
									<Button variant="secondary" className="font-medium flex-1 sm:flex-none" onClick={() => router.push('/studio')}>
										{t('common.manage_videos')}
									</Button>
								</>
							) : (
								<SubscribeButton
									channelId={channel.id}
									initialIsSubscribed={channel.isSubscribed}
									initialNotify={channel.notify}
									className="h-9 w-full sm:w-auto px-6"
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
						<TabsList className="w-full justify-start border-b border-border/40 rounded-none h-auto p-0 bg-transparent gap-4 md:gap-8 overflow-x-auto scrollbar-hide">
							<TabsTrigger
								value="videos"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-0 py-3 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-colors text-sm tracking-wide"
							>
								{t('common.videos')}
							</TabsTrigger>
							<TabsTrigger
								value="shorts"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-0 py-3 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-colors text-sm tracking-wide"
							>
								{t('common.shorts')}
							</TabsTrigger>
							<TabsTrigger
								value="playlists"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-0 py-3 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-colors text-sm tracking-wide"
							>
								{t('common.playlists')}
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
									<p className="text-lg">{t('common.no_videos')}</p>
								</div>
							)}
						</TabsContent>

						<TabsContent value="shorts" className="mt-6">
							<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 pb-10">
								{shortVideos.map((video) => (
									<div key={video.id} className="relative group">
										<a href={`/shorts/${video.id}`} className="block aspect-9/16 relative rounded-xl overflow-hidden">
											<Image
												src={video.thumbnail || '/images/no-thumbnail.jpg'}
												alt={video.title}
												fill
												className="object-cover transition-transform duration-300 group-hover:scale-105"
											/>
											<div className="absolute inset-0 bg-linear-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
										</a>
										<div className="mt-2 flex gap-x-2 items-start">
											<div className="flex-1 min-w-0">
												<a href={`/shorts/${video.id}`}>
													<h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors mb-1">{video.title}</h3>
												</a>
												<div className="text-xs text-muted-foreground">
													{formatCompactNumber(normalizeViewCount(video.views), language === 'ro' ? 'ro-RO' : 'en-US')} {t('common.views')}
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
							{shortVideos.length === 0 && (
								<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
									<p className="text-lg">{t('common.no_shorts')}</p>
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
									<p className="text-lg">{t('common.no_playlists')}</p>
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
