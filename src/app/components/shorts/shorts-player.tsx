'use client';

import { Video } from '~app/types';
import { useRef, useState, useEffect } from 'react';
import { Button } from '~components/button';
import { Avatar, AvatarFallback, AvatarImage } from '~components/avatar';
import { MessageCircle, Share2, MoreVertical, Play, Volume2, VolumeX, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { cn } from '~lib/utils';
import Link from 'next/link';
import { SubscribeButton } from '~components/subscribe-button';
import { authClient } from '~lib/auth-client';
import axios from 'axios';
import Hls from 'hls.js';

interface ShortsPlayerProps {
	video: Video;
	isActive: boolean;
	shouldLoad?: boolean;
	toggleMute: () => void;
	isMuted: boolean;
	onCommentClick: () => void;
	variant?: 'feed' | 'studio';
}

export const ShortsPlayer = ({ video, isActive, shouldLoad = true, toggleMute, isMuted, onCommentClick, variant = 'feed' }: ShortsPlayerProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const hlsRef = useRef<Hls | null>(null);
	const progressBarRef = useRef<HTMLDivElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [liked, setLiked] = useState(false);
	const [disliked, setDisliked] = useState(false);
	const [likesCount, setLikesCount] = useState(parseInt(video.likes || '0') || 0);
	const [dislikesCount, setDislikesCount] = useState(parseInt(video.dislikes || '0') || 0);
	const { data: session } = authClient.useSession();
	const isOwner = session?.user?.id === video.channel.id;
	const [isCopied, setIsCopied] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const progressContainerRef = useRef<HTMLDivElement>(null);

	// Seek Logic
	const handleSeek = (clientX: number) => {
		if (!progressContainerRef.current || !videoRef.current) return;
		const rect = progressContainerRef.current.getBoundingClientRect();
		const percent = Math.min(Math.max(0, clientX - rect.left), rect.width) / rect.width;
		if (Number.isFinite(percent) && Number.isFinite(videoRef.current.duration)) {
			videoRef.current.currentTime = percent * videoRef.current.duration;
			if (progressBarRef.current) {
				progressBarRef.current.style.width = `${percent * 100}%`;
			}
		}
	};

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging) {
				e.preventDefault();
				handleSeek(e.clientX);
			}
		};
		const handleMouseUp = () => {
			setIsDragging(false);
		};
		const handleTouchMove = (e: TouchEvent) => {
			if (isDragging) {
				e.preventDefault();
				handleSeek(e.touches[0].clientX);
			}
		};
		const handleTouchEnd = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.addEventListener('touchmove', handleTouchMove, { passive: false });
			document.addEventListener('touchend', handleTouchEnd);
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleTouchEnd);
		};
	}, [isDragging]);

	// HLS Setup
	useEffect(() => {
		const videoEl = videoRef.current;
		if (!videoEl) return;

		let hlsSrc: string | null = null;
		let directSrc: string | null = null;

		if (video.isExternal && video.videoUrl) {
			if (video.videoUrl.includes('.m3u8')) {
				hlsSrc = video.videoUrl;
			} else {
				directSrc = video.videoUrl;
			}
		} else {
			hlsSrc = `/api/stream/${video.id}/master.m3u8`;
		}

		if (hlsSrc && Hls.isSupported()) {
			if (hlsRef.current) {
				hlsRef.current.destroy();
			}

			const hls = new Hls({
				capLevelToPlayerSize: true,
				autoStartLoad: true
			});
			hlsRef.current = hls;

			hls.loadSource(hlsSrc);
			hls.attachMedia(videoEl);

			hls.on(Hls.Events.ERROR, function (event, data) {
				if (data.fatal) {
					switch (data.type) {
						case Hls.ErrorTypes.NETWORK_ERROR:
							hls.startLoad();
							break;
						case Hls.ErrorTypes.MEDIA_ERROR:
							hls.recoverMediaError();
							break;
						default:
							hls.destroy();
							break;
					}
				}
			});
		} else if (hlsSrc && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
			videoEl.src = hlsSrc;
		} else if (directSrc) {
			videoEl.src = directSrc;
		}

		return () => {
			if (hlsRef.current) {
				hlsRef.current.destroy();
			}
		};
	}, [video.id, video.isExternal, video.videoUrl]);

	useEffect(() => {
		const videoEl = videoRef.current;
		if (!videoEl) return;

		let historyTimeout: NodeJS.Timeout;

		const handlePlay = async () => {
			try {
				if (isActive && videoEl.paused) {
					await videoEl.play();
					setIsPlaying(true);
				}
			} catch (error) {
				// Silently fail for abort errors during quick navigation
				if (error instanceof Error && error.name !== 'AbortError') {
					console.log('Autoplay prevented:', error);
				}
				setIsPlaying(false);
			}
		};

		if (isActive) {
			if (videoEl.readyState >= 3) {
				handlePlay();
			} else {
				videoEl.addEventListener('canplay', handlePlay, { once: true });
			}

			// Record history when video starts playing (or becomes active)
			// We use a small delay to ensure it's an intentional view
			historyTimeout = setTimeout(async () => {
				try {
					await axios.post(`/api/videos/${video.id}/progress`, {
						progress: 0,
						completed: false
					});
				} catch (error) {
					console.error('Error recording history view:', error);
				}
			}, 1000); // Record after 1 second of viewing
		} else {
			videoEl.pause();
			setIsPlaying(false);
		}

		return () => {
			clearTimeout(historyTimeout);
			videoEl.removeEventListener('canplay', handlePlay);
		};
	}, [isActive, video.id]);

	useEffect(() => {
		const vid = videoRef.current;
		if (!vid) return;

		const updateProgress = () => {
			if (!isDragging && vid.duration && progressBarRef.current) {
				const percent = (vid.currentTime / vid.duration) * 100;
				progressBarRef.current.style.width = `${percent}%`;
			}
		};

		vid.addEventListener('timeupdate', updateProgress);
		return () => vid.removeEventListener('timeupdate', updateProgress);
	}, [isDragging]);

	const togglePlay = async () => {
		const vid = videoRef.current;
		if (!vid) return;

		// Don't attempt to play if there's no source yet
		if (!vid.currentSrc && !vid.src) return;

		try {
			if (vid.paused) {
				await vid.play();
				setIsPlaying(true);
			} else {
				vid.pause();
				setIsPlaying(false);
			}
		} catch (error) {
			// Silently fail for abort errors and not supported errors (loading/unloading)
			if (error instanceof Error && error.name !== 'AbortError' && error.name !== 'NotSupportedError') {
				console.error('Toggle play error:', error);
			}
			setIsPlaying(false);
		}
	};

	const handleLike = async () => {
		const newLiked = !liked;
		setLiked(newLiked);
		setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));
		if (newLiked && disliked) {
			setDisliked(false);
			setDislikesCount((prev) => prev - 1);
		}

		try {
			await axios.post(`/api/videos/${video.id}/reaction`, {
				type: newLiked ? 'LIKE' : 'REMOVE'
			});
		} catch (error) {
			console.error('Error updating like:', error);
			// Revert on error could be implemented here
		}
	};

	const handleDislike = async () => {
		const newDisliked = !disliked;
		setDisliked(newDisliked);
		setDislikesCount((prev) => (newDisliked ? prev + 1 : prev - 1));
		if (newDisliked && liked) {
			setLiked(false);
			setLikesCount((prev) => prev - 1);
		}

		try {
			await axios.post(`/api/videos/${video.id}/reaction`, {
				type: newDisliked ? 'DISLIKE' : 'REMOVE'
			});
		} catch (error) {
			console.error('Error updating dislike:', error);
		}
	};

	const handleShare = async () => {
		const url = `${window.location.origin}/shorts/${video.id}`;
		try {
			await navigator.clipboard.writeText(url);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		} catch (err) {
			console.error('Error copying to clipboard:', err);
		}
	};

	const ActionButtons = ({ className }: { className?: string }) => (
		<div className={cn('flex flex-col gap-6 items-center pointer-events-auto', className)}>
			<div className="flex flex-col items-center gap-1">
				<Button
					variant="ghost"
					size="icon"
					className={cn('rounded-full md:bg-zinc-800/60 md:hover:bg-zinc-700/80 w-12 h-12 text-white', liked && 'text-primary fill-primary')}
					onClick={handleLike}
				>
					<ThumbsUp className={cn('w-6 h-6', liked && 'fill-current')} />
				</Button>
				<span className="text-xs font-medium text-white drop-shadow-md">{likesCount}</span>
			</div>

			<div className="flex flex-col items-center gap-1">
				<Button
					variant="ghost"
					size="icon"
					className={cn('rounded-full md:bg-zinc-800/60 md:hover:bg-zinc-700/80 w-12 h-12 text-white', disliked && 'text-white fill-white')}
					onClick={handleDislike}
				>
					<ThumbsDown className={cn('w-6 h-6', disliked && 'fill-current')} />
				</Button>
				<span className="text-xs font-medium text-white drop-shadow-md">{dislikesCount}</span>
			</div>

			<div className="flex flex-col items-center gap-1">
				<Button variant="ghost" size="icon" className="rounded-full md:bg-zinc-800/60 md:hover:bg-zinc-700/80 w-12 h-12 text-white" onClick={onCommentClick}>
					<MessageCircle className="w-6 h-6" />
				</Button>
				<span className="text-xs font-medium text-white drop-shadow-md">Comments</span>
			</div>

			<div className="flex flex-col items-center gap-1">
				<Button variant="ghost" size="icon" className="rounded-full md:bg-zinc-800/60 md:hover:bg-zinc-700/80 w-12 h-12 text-white" onClick={handleShare}>
					{isCopied ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
				</Button>
				<span className="text-xs font-medium text-white drop-shadow-md">Share</span>
			</div>
		</div>
	);

	// If shouldLoad is false, we only render a thumbnail placeholder
	if (!shouldLoad) {
		return (
			<div className="relative h-full w-full flex justify-center snap-start shrink-0 overflow-hidden dark bg-black">
				<div className="relative h-full aspect-9/16 max-w-full">
					{/* Thumbnail Image */}
					<img src={video.thumbnail || video.channel.banner || '/placeholder-video.jpg'} alt={video.title} className="h-full w-full object-cover opacity-50 blur-sm" />

					{/* Loading Spinner or Placeholder UI */}
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="w-10 h-10 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
					</div>

					{/* Overlay Info (Static) */}
					<div className="absolute inset-0 flex flex-col justify-between p-4 pb-8 z-10 pointer-events-none">
						<div className="flex justify-between items-start">
							{/* Placeholder for header controls */}
							<div className="w-8 h-8" />
							<div className="w-8 h-8" />
						</div>

						{variant === 'feed' && (
							<div className="flex items-end gap-4">
								<div className="flex-1 space-y-4">
									<div className="flex items-center gap-2">
										<div className="w-9 h-9 rounded-full bg-white/10" />
										<div className="h-4 w-24 bg-white/10 rounded" />
									</div>
									<div className="space-y-2">
										<div className="h-4 w-3/4 bg-white/10 rounded" />
										<div className="h-4 w-1/2 bg-white/10 rounded" />
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full flex justify-center snap-start shrink-0 overflow-hidden dark bg-black">
			<div className="flex h-full items-end justify-center w-full">
				{/* Video container with aspect ratio handling */}
				<div className="relative h-full aspect-9/16 max-w-full">
					<video ref={videoRef} className="h-full w-full object-cover" loop playsInline muted={isMuted} onClick={togglePlay} />

					{/* Progress Bar */}
					<div
						ref={progressContainerRef}
						className="absolute bottom-0 left-0 w-full h-5 z-20 cursor-pointer flex items-end group touch-none pb-px"
						onMouseDown={(e) => {
							setIsDragging(true);
							handleSeek(e.clientX);
						}}
						onTouchStart={(e) => {
							setIsDragging(true);
							handleSeek(e.touches[0].clientX);
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="w-full h-1 bg-gray-600/50 group-hover:h-2 transition-all duration-200 relative">
							<div ref={progressBarRef} className={cn('absolute top-0 left-0 h-full bg-primary ease-linear', !isDragging && 'transition-all duration-100')} style={{ width: '0%' }}>
								<div
									className={cn(
										'absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-md translate-x-1/2 scale-0 group-hover:scale-100 transition-transform',
										isDragging && 'scale-100'
									)}
								/>
							</div>
						</div>
					</div>

					{/* Overlay Controls */}
					<div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 pb-8 z-10">
						{/* Top Header */}
						<div className="flex justify-between items-start">
							{!isPlaying && (
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
									<div className="bg-black/40 p-4 rounded-full backdrop-blur-sm pointer-events-auto cursor-pointer" onClick={togglePlay}>
										<Play className={cn('text-white fill-white', variant === 'studio' ? 'w-6 h-6' : 'w-8 h-8')} />
									</div>
								</div>
							)}
							<div className="flex-1" />
							<Button variant="ghost" size="icon" className="text-white pointer-events-auto hover:bg-black/20" onClick={toggleMute}>
								{isMuted ? <VolumeX /> : <Volume2 />}
							</Button>
						</div>

						{/* Feed Controls (Info & Actions) - Only show in 'feed' variant */}
						{variant === 'feed' && (
							<div className="flex items-end gap-4">
								<div className="flex-1 space-y-4 pointer-events-auto min-w-0">
									<div className="flex items-center gap-2">
										<Link href={`/channel/${video.channel.id}`} className="flex items-center gap-2 group min-w-0">
											<Avatar className="w-9 h-9 border border-white/20 shrink-0">
												<AvatarImage src={video.channel.avatar} />
												<AvatarFallback>{video.channel.name[0]}</AvatarFallback>
											</Avatar>
											<span className="font-semibold text-white group-hover:underline drop-shadow-md truncate max-w-[120px]">@{video.channel.handle}</span>
										</Link>
										<SubscribeButton
											channelId={video.channel.id}
											initialIsSubscribed={false}
											buttonClassName="h-8 bg-white text-black hover:bg-white/90 shrink-0"
											isOwner={isOwner}
										/>
									</div>

									<div>
										<p className="text-white line-clamp-1 mb-2 drop-shadow-md font-medium">{video.title}</p>
									</div>
								</div>

								{/* Right Side Actions (Mobile Only) */}
								<ActionButtons className="md:hidden pb-4 shrink-0" />
							</div>
						)}
					</div>
				</div>

				{/* Desktop Side Actions - Only show in 'feed' variant */}
				{variant === 'feed' && (
					<div className="hidden md:flex flex-col justify-end pb-4 pl-4 z-20">
						<ActionButtons />
					</div>
				)}
			</div>
		</div>
	);
};
