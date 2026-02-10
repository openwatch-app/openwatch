'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Video } from '~app/types';
import { Button } from '~components/button';
import { Play, Shuffle, Share2, Loader2, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { cn, normalizeViewCount } from '~lib/utils';
import { authClient } from '~lib/auth-client';
import { useTranslation } from '~lib/i18n';
import Image from 'next/image';
import dayjs from 'dayjs';
import { PlaylistVideoItem } from '~app/components/playlists/playlist-video-item';
import { EditPlaylistDialog } from '~app/components/playlists/edit-playlist-dialog';

interface Playlist {
	id: string;
	title: string;
	description: string | null;
	visibility: 'public' | 'private' | 'unlisted';
	userId: string;
	createdAt: string;
	updatedAt: string;
	user: {
		id: string;
		name: string;
		avatar: string;
		handle: string;
	};
	videos: Video[];
	videoCount: number;
}

const PlaylistPage = () => {
	const { t } = useTranslation();
	const params = useParams();
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const id = params.id as string;

	const [playlist, setPlaylist] = useState<Playlist | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);

	const isOwner = session?.user?.id === playlist?.userId;

	useEffect(() => {
		const fetchPlaylist = async () => {
			try {
				setLoading(true);
				// Fetch playlist details
				const res = await axios.get(`/api/playlists/${id}`);
				const playlistData = res.data;

				setPlaylist({
					...playlistData,
					videoCount: playlistData.videos.length
				});
			} catch (err: any) {
				console.error('Error fetching playlist:', err);
				setError(err.response?.data?.error || 'Failed to load playlist');
			} finally {
				setLoading(false);
			}
		};

		if (id) {
			fetchPlaylist();
		}
	}, [id]);

	const handleRemoveVideo = async (videoId: string) => {
		if (!playlist) return;

		// Optimistic update
		const previousVideos = [...playlist.videos];
		setPlaylist((prev) => {
			if (!prev) return null;
			return {
				...prev,
				videos: prev.videos.filter((v) => v.id !== videoId),
				videoCount: prev.videoCount - 1
			};
		});

		try {
			await axios.delete(`/api/playlists/${id}/videos?videoId=${videoId}`);
		} catch (err) {
			console.error('Error removing video:', err);
			// Revert
			setPlaylist((prev) => {
				if (!prev) return null;
				return { ...prev, videos: previousVideos, videoCount: previousVideos.length };
			});
		}
	};

	const handleDeletePlaylist = async () => {
		if (!confirm('Are you sure you want to delete this playlist?')) return;

		try {
			setDeleting(true);
			await axios.delete(`/api/playlists/${id}`);
			router.push('/');
		} catch (err) {
			console.error('Error deleting playlist:', err);
			setDeleting(false);
		}
	};

	const handleShuffle = () => {
		if (!playlist || playlist.videos.length === 0) return;
		const randomIndex = Math.floor(Math.random() * playlist.videos.length);
		const randomVideo = playlist.videos[randomIndex];
		router.push(`/watch/${randomVideo.id}?list=${playlist.id}`);
	};

	const handleShare = () => {
		const shareUrl = `${window.location.origin}/playlist/${id}`;
		navigator.clipboard.writeText(shareUrl);
		alert(t('playlists.page.share_copied'));
	};

	const handlePlaylistUpdate = (updatedPlaylist: any) => {
		setPlaylist((prev) => {
			if (!prev) return null;
			return { ...prev, ...updatedPlaylist };
		});
	};

	if (loading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !playlist) {
		return (
			<div className="flex flex-col h-[50vh] items-center justify-center gap-4">
				<AlertCircle className="h-12 w-12 text-destructive" />
				<p className="text-lg text-muted-foreground">{error || t('common.no_playlists_found')}</p>
				<Button variant="outline" onClick={() => router.push('/')}>
					{t('common.go_home')}
				</Button>
			</div>
		);
	}

	// Calculate stats
	const firstVideo = playlist.videos[0];
	const thumbnail = firstVideo?.thumbnail || '/images/no-thumbnail.jpg';

	return (
		<div className="flex flex-col lg:flex-row max-w-[1284px] mx-auto w-full p-4 sm:p-6 gap-6">
			{/* Left Sidebar (Playlist Info) */}
			<div className="lg:w-[360px] shrink-0">
				<div className="lg:sticky lg:top-24 flex flex-col gap-4 bg-secondary/30 rounded-2xl p-6 backdrop-blur-sm border border-border/50">
					{/* Cover Image */}
					<div className="aspect-video w-full rounded-xl overflow-hidden relative shadow-lg group">
						<Image src={thumbnail} alt={playlist.title} fill className="object-cover" />
						<div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
						<div className="absolute bottom-4 right-4 bg-black/80 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
							<ListPlusIcon className="w-3 h-3" />
							<span>{t('playlists.page.videos_count', { count: playlist.videoCount })}</span>
						</div>
					</div>

					{/* Title & Info */}
					<div className="space-y-2">
						<h1 className="text-2xl font-bold leading-tight">{playlist.title}</h1>

						<div className="flex flex-col gap-1 text-sm text-muted-foreground font-medium">
							<div className="flex items-center gap-2 text-foreground">
								<h3 className="font-semibold cursor-pointer hover:underline" onClick={() => router.push(`/channel/${playlist.user.handle || playlist.user.id}`)}>
									{playlist.user.name}
								</h3>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<span>
									{playlist.visibility === 'public'
										? t('common.visibility.public')
										: playlist.visibility === 'unlisted'
											? t('common.visibility.unlisted')
											: t('common.visibility.private')}
								</span>
								<span>•</span>
								<span>{t('playlists.page.videos_count', { count: playlist.videoCount })}</span>
								<span>•</span>
								<span>{t('playlists.page.updated', { date: dayjs(playlist.updatedAt).format('MMM D, YYYY') })}</span>
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-2">
						<Button className="flex-1 rounded-full gap-2" disabled={playlist.videoCount === 0} onClick={() => firstVideo && router.push(`/watch/${firstVideo.id}?list=${playlist.id}`)}>
							<Play className="w-4 h-4 fill-current" />
							<span>{t('playlists.page.play_all')}</span>
						</Button>
						<Button variant="secondary" className="flex-1 rounded-full gap-2" disabled={playlist.videoCount === 0} onClick={handleShuffle}>
							<Shuffle className="w-4 h-4" />
							<span>{t('playlists.page.shuffle')}</span>
						</Button>
					</div>

					{/* Additional Actions */}
					<div className="flex items-center gap-2">
						{isOwner && (
							<Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsEditOpen(true)} title={t('playlists.page.edit')}>
								<Pencil className="w-5 h-5" />
							</Button>
						)}
						{isOwner && (
							<Button
								variant="ghost"
								size="icon"
								className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
								onClick={handleDeletePlaylist}
								disabled={deleting}
								title={t('playlists.page.delete')}
							>
								{deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
							</Button>
						)}
						<Button variant="ghost" size="icon" className="rounded-full" onClick={handleShare} title={t('playlists.page.share')}>
							<Share2 className="w-5 h-5" />
						</Button>
					</div>

					{/* Description */}
					{playlist.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{playlist.description}</div>}
				</div>
			</div>

			<EditPlaylistDialog playlist={playlist} open={isEditOpen} onOpenChange={setIsEditOpen} onUpdate={handlePlaylistUpdate} />

			{/* Right Content (Videos) */}
			<div className="flex-1 min-w-0">
				{playlist.videoCount === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
						<p>{t('playlists.page.no_videos')}</p>
						{isOwner && (
							<Button variant="link" onClick={() => router.push('/')}>
								{t('playlists.page.browse_videos')}
							</Button>
						)}
					</div>
				) : (
					<div className="space-y-1">
						{playlist.videos.map((video, index) => (
							<PlaylistVideoItem key={video.id} video={video} index={index} isOwner={!!isOwner} onRemove={() => handleRemoveVideo(video.id)} />
						))}
					</div>
				)}
			</div>
		</div>
	);
};

// Helper icon
const ListPlusIcon = ({ className }: { className?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
		<path d="M21 15v6" />
		<path d="M18 18h6" />
		<path d="M3 6h18" />
		<path d="M3 12h18" />
		<path d="M3 18h12" />
	</svg>
);

export default PlaylistPage;
