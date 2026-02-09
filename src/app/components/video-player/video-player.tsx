'use client';

import { Play, Pause, Volume2, VolumeX, Volume1, Settings, Maximize, Minimize, PictureInPicture, Check, Volume, ChevronsLeft, ChevronsRight, RectangleHorizontal } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '~components/button';
import { useAppStore } from '~lib/store';
import { cn } from '~lib/utils';
import Hls from 'hls.js';
import axios from 'axios';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuPortal
} from '~components/dropdown-menu';

interface VideoPlayerProps {
	videoId: string;
	videoUrl?: string;
	autoPlay?: boolean;
	initialTime?: number;
	onEnded?: () => void;
	children?: React.ReactNode;
	showAutoplayToggle?: boolean;
	autoplayEnabled?: boolean;
	onAutoplayChange?: (enabled: boolean) => void;
}

const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const VideoPlayerTooltip = ({ content, className }: { content: React.ReactNode; className?: string }) => (
	<div
		className={cn(
			'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50',
			className
		)}
	>
		{content}
	</div>
);

export const VideoPlayer = ({ videoId, videoUrl, autoPlay = false, initialTime = 0, onEnded, children, showAutoplayToggle, autoplayEnabled, onAutoplayChange }: VideoPlayerProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const hlsRef = useRef<Hls | null>(null);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(initialTime);
	const [duration, setDuration] = useState(0);
	const { volume, setVolume, isMuted, setIsMuted, theaterMode, setTheaterMode, playbackRate, setPlaybackRate } = useAppStore();
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);
	const [buffered, setBuffered] = useState(0);

	const [levels, setLevels] = useState<any[]>([]);
	const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto
	const [isProcessing, setIsProcessing] = useState(false);
	const [seekOverlay, setSeekOverlay] = useState<'left' | 'right' | null>(null);

	const lastSavedTimeRef = useRef(initialTime);
	const hasInitialSeeked = useRef(false);
	const hasMarkedCompleted = useRef(false);
	const lastTapRef = useRef<{ time: number; x: number } | null>(null);
	const seekOverlayTimeoutRef = useRef<NodeJS.Timeout>(null);

	useEffect(() => {
		return () => {
			if (controlsTimeoutRef.current) {
				clearTimeout(controlsTimeoutRef.current);
				controlsTimeoutRef.current = null;
			}
			if (seekOverlayTimeoutRef.current) {
				clearTimeout(seekOverlayTimeoutRef.current);
				seekOverlayTimeoutRef.current = null;
			}
		};
	}, []);

	const saveProgress = useCallback(
		async (time: number, completed: boolean = false) => {
			if (Math.abs(time - lastSavedTimeRef.current) > 10 || completed) {
				try {
					await axios.post(`/api/videos/${videoId}/progress`, {
						progress: Math.floor(time),
						completed
					});
					lastSavedTimeRef.current = time;
				} catch (error) {
					console.error('Failed to save progress', error);
				}
			}
		},
		[videoId]
	);

	// Save progress on unmount or page leave
	useEffect(() => {
		const currentVideo = videoRef.current;
		const handleUnload = () => {
			if (currentVideo) {
				// We use sendBeacon for reliability on page unload
				const blob = new Blob(
					[
						JSON.stringify({
							progress: Math.floor(currentVideo.currentTime),
							completed: false
						})
					],
					{ type: 'application/json' }
				);
				navigator.sendBeacon(`/api/videos/${videoId}/progress`, blob);
			}
		};

		window.addEventListener('beforeunload', handleUnload);
		return () => {
			window.removeEventListener('beforeunload', handleUnload);
			// Also try to save on component unmount
			if (currentVideo) {
				saveProgress(currentVideo.currentTime);
			}
		};
	}, [videoId, saveProgress]);

	// Sync playback rate with video element
	useEffect(() => {
		if (videoRef.current) {
			videoRef.current.playbackRate = playbackRate;
		}
	}, [playbackRate]);

	// Sync volume with video element
	useEffect(() => {
		if (videoRef.current) {
			// Ensure volume is between 0 and 1 to prevent IndexSizeError
			const safeVolume = Math.min(Math.max(volume, 0), 1);
			videoRef.current.volume = safeVolume;
			videoRef.current.muted = isMuted;
		}
	}, [volume, isMuted]);

	// Initial HLS setup
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		// Reset completion status for new video
		hasMarkedCompleted.current = false;

		// Determine Source URL
		let sourceUrl = `/api/stream/${videoId}/master.m3u8?t=${Date.now()}`;
		let isExternal = false;
		if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('//'))) {
			sourceUrl = videoUrl;
			isExternal = true;
		}

		// Helper to safely play
		const safePlay = () => {
			const playPromise = video.play();
			if (playPromise !== undefined) {
				playPromise.catch((error) => {
					// Auto-play was prevented or interrupted
					setIsPlaying(false);
				});
			}
		};

		// If external non-m3u8, use native player
		if (isExternal && !sourceUrl.includes('.m3u8')) {
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}
			video.src = sourceUrl;
			if (autoPlay) safePlay();
			return;
		}

		let hls: Hls | null = null;
		let retryCount = 0;
		const maxRetries = 10;

		const initHls = () => {
			if (Hls.isSupported()) {
				hls = new Hls({
					capLevelToPlayerSize: true,
					autoStartLoad: true
				});
				hlsRef.current = hls;

				hls.on(Hls.Events.ERROR, function (event, data) {
					if (data.fatal) {
						switch (data.type) {
							case Hls.ErrorTypes.NETWORK_ERROR:
								// General retry logic for network errors
								if (retryCount < maxRetries) {
									retryCount++;
									const currentRetry = retryCount; // capture for closure

									setIsProcessing(true);

									// Add delay before retrying to prevent tight loops
									setTimeout(() => {
										hls?.startLoad();
										// If it was a specific loading error, we might need to reload source
										if (data.details === 'manifestLoadError' || data.details === 'manifestParsingError' || data.response?.code === 404) {
											hls?.loadSource(sourceUrl);
										}
									}, 2000);
								} else {
									hls?.destroy();
									// Fallback removed as per user request to enforce streaming
								}
								break;
							case Hls.ErrorTypes.MEDIA_ERROR:
								hls?.recoverMediaError();
								break;
							default:
								hls?.destroy();
								break;
						}
					}
				});

				hls.loadSource(sourceUrl);
				hls.attachMedia(video);

				hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
					setLevels(hls?.levels || []);
					setIsProcessing(false);
					if (initialTime > 0 && !hasInitialSeeked.current && video) {
						video.currentTime = initialTime;
						hasInitialSeeked.current = true;
					}
					if (autoPlay) safePlay();
				});
			} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
				video.src = sourceUrl;
				if (initialTime > 0 && !hasInitialSeeked.current) {
					video.currentTime = initialTime;
					hasInitialSeeked.current = true;
				}
				if (autoPlay) safePlay();
			}
		};

		initHls();

		return () => {
			if (hls) {
				hls.destroy();
			}
		};
	}, [videoId, videoUrl, autoPlay, initialTime]);

	const togglePlay = useCallback(() => {
		if (videoRef.current) {
			if (videoRef.current.paused) {
				const playPromise = videoRef.current.play();
				if (playPromise !== undefined) {
					playPromise.catch((error) => {
						// Error handled
					});
				}
			} else {
				videoRef.current.pause();
				// Save progress on pause
				saveProgress(videoRef.current.currentTime);
			}
		}
	}, [saveProgress]);

	const handleTimeUpdate = () => {
		if (videoRef.current) {
			const time = videoRef.current.currentTime;
			setCurrentTime(time);

			// Save progress periodically
			saveProgress(time);

			if (!isNaN(videoRef.current.duration) && videoRef.current.duration !== Infinity) {
				setDuration(videoRef.current.duration);

				// Mark as completed if near end (e.g., 95%)
				if (time > videoRef.current.duration * 0.95) {
					if (!hasMarkedCompleted.current) {
						saveProgress(time, true);
						hasMarkedCompleted.current = true;
					}
				}
			}

			if (videoRef.current.buffered.length > 0) {
				// Find the buffered range that covers current time
				for (let i = 0; i < videoRef.current.buffered.length; i++) {
					if (videoRef.current.buffered.start(i) <= videoRef.current.currentTime && videoRef.current.buffered.end(i) >= videoRef.current.currentTime) {
						setBuffered(videoRef.current.buffered.end(i));
						break;
					}
				}
			}
		}
	};

	const handleLoadedMetadata = () => {
		if (videoRef.current) {
			if (!isNaN(videoRef.current.duration) && videoRef.current.duration !== Infinity) {
				setDuration(videoRef.current.duration);
			}
			// Fallback seek if HLS didn't handle it (e.g. native playback)
			if (initialTime > 0 && !hasInitialSeeked.current) {
				videoRef.current.currentTime = initialTime;
				hasInitialSeeked.current = true;
			}
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = parseFloat(e.target.value);
		if (videoRef.current) {
			videoRef.current.currentTime = time;
			setCurrentTime(time);
			hasMarkedCompleted.current = false;
		}
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const vol = parseFloat(e.target.value);
		setVolume(vol);
		if (vol === 0) {
			setIsMuted(true);
		} else if (isMuted) {
			setIsMuted(false);
		}
	};

	const toggleMute = () => {
		if (isMuted) {
			if (volume === 0) setVolume(1);
			setIsMuted(false);
		} else {
			setIsMuted(true);
		}
	};

	// Handle fullscreen changes and orientation
	useEffect(() => {
		const handleFullscreenChange = () => {
			const isFs = !!document.fullscreenElement;
			setIsFullscreen(isFs);
			if (!isFs && screen.orientation && 'unlock' in screen.orientation) {
				try {
					(screen.orientation as any).unlock();
				} catch (e) {
					// Ignore errors
				}
			}
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	}, []);

	const toggleFullscreen = async () => {
		try {
			if (!isFullscreen) {
				if (containerRef.current) {
					await containerRef.current.requestFullscreen();
					if (screen.orientation && 'lock' in screen.orientation) {
						try {
							await (screen.orientation as any).lock('landscape');
						} catch (e) {
							// Ignore errors
						}
					}
				}
			} else {
				await document.exitFullscreen();
			}
		} catch (error) {
			console.error('Fullscreen error:', error);
		}
	};

	const togglePiP = async () => {
		if (!videoRef.current) return;

		if (document.pictureInPictureElement) {
			await document.exitPictureInPicture();
		} else {
			await videoRef.current.requestPictureInPicture();
		}
	};

	const handleQualityChange = (levelIndex: number) => {
		if (hlsRef.current) {
			if (levelIndex === -1) {
				hlsRef.current.currentLevel = -1;
			} else {
				// If video is playing, use nextLevel to avoid buffer flush and freeze (smooth switch)
				// If paused, use currentLevel to switch immediately
				if (videoRef.current && !videoRef.current.paused) {
					hlsRef.current.nextLevel = levelIndex;
				} else {
					hlsRef.current.currentLevel = levelIndex;
				}
			}
			setCurrentLevel(levelIndex);
		}
	};

	const handleSpeedChange = (speed: number) => {
		setPlaybackRate(speed);
	};

	const formatTime = (seconds: number) => {
		if (!seconds || isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	// Auto-hide controls
	const handleMouseMove = () => {
		setShowControls(true);
		if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
		controlsTimeoutRef.current = setTimeout(() => {
			setShowControls(false);
		}, 3000);
	};

	const handleSeekRelative = (seconds: number) => {
		if (videoRef.current) {
			const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
			videoRef.current.currentTime = newTime;
			setCurrentTime(newTime);
			hasMarkedCompleted.current = false;
		}
	};

	const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const width = rect.width;
		const percent = x / width;
		const now = Date.now();

		// Double Tap Logic
		if (lastTapRef.current && now - lastTapRef.current.time < 300) {
			const lastPercent = lastTapRef.current.x / width;

			// Left side (< 30%)
			if (percent < 0.3 && lastPercent < 0.3) {
				handleSeekRelative(-10);
				setSeekOverlay('left');
				if (seekOverlayTimeoutRef.current) clearTimeout(seekOverlayTimeoutRef.current);
				seekOverlayTimeoutRef.current = setTimeout(() => setSeekOverlay(null), 1000);
				lastTapRef.current = null;
				return;
			}

			// Right side (> 70%)
			if (percent > 0.7 && lastPercent > 0.7) {
				handleSeekRelative(10);
				setSeekOverlay('right');
				if (seekOverlayTimeoutRef.current) clearTimeout(seekOverlayTimeoutRef.current);
				seekOverlayTimeoutRef.current = setTimeout(() => setSeekOverlay(null), 1000);
				lastTapRef.current = null;
				return;
			}

			// Center (30-70%) - Double tap for fullscreen
			if (percent >= 0.3 && percent <= 0.7 && lastPercent >= 0.3 && lastPercent <= 0.7) {
				toggleFullscreen();
				lastTapRef.current = null;
				return;
			}
		}

		lastTapRef.current = { time: now, x };

		// Single Tap Logic

		// If controls are hidden, first tap just shows them
		if (!showControls) {
			setShowControls(true);
			if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
			controlsTimeoutRef.current = setTimeout(() => {
				setShowControls(false);
			}, 3000);
			return;
		}

		// Center: Toggle Play/Pause
		if (percent >= 0.3 && percent <= 0.7) {
			togglePlay();
			// Keep controls visible for a moment after interaction
			if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
			controlsTimeoutRef.current = setTimeout(() => {
				setShowControls(false);
			}, 3000);
		} else {
			// Sides: Hide Controls
			setShowControls(false);
		}
	};

	return (
		<div
			ref={containerRef}
			className={cn('relative w-full bg-black group select-none', theaterMode ? 'h-full' : 'aspect-video')}
			onMouseMove={handleMouseMove}
			onMouseLeave={() => setShowControls(false)}
		>
			<video
				ref={videoRef}
				className="w-full h-full object-contain"
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleLoadedMetadata}
				onEnded={() => {
					setIsPlaying(false);
					onEnded?.();
				}}
			/>

			{/* Interaction Overlay */}
			<div className="absolute inset-0 z-10" onClick={handleTap} />

			{/* Seek Feedback Overlays */}
			{seekOverlay === 'left' && (
				<div className="absolute left-0 top-0 bottom-0 w-1/3 z-20 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[2px] rounded-r-full animate-in fade-in zoom-in duration-200">
					<div className="flex flex-col items-center gap-2">
						<ChevronsLeft className="w-12 h-12 text-white" />
						<span className="text-white font-medium text-sm">10 seconds</span>
					</div>
				</div>
			)}
			{seekOverlay === 'right' && (
				<div className="absolute right-0 top-0 bottom-0 w-1/3 z-20 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[2px] rounded-l-full animate-in fade-in zoom-in duration-200">
					<div className="flex flex-col items-center gap-2">
						<ChevronsRight className="w-12 h-12 text-white" />
						<span className="text-white font-medium text-sm">10 seconds</span>
					</div>
				</div>
			)}

			{/* Center Play/Pause Button */}
			<div className={cn('absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity duration-300', showControls ? 'opacity-100' : 'opacity-0')}>
				<div className="bg-black/50 w-14 h-14 rounded-full backdrop-blur-sm flex items-center justify-center">
					{isPlaying ? <Pause className="w-8 h-8 text-white fill-white" /> : <Play className="w-8 h-8 text-white fill-white ml-1" />}
				</div>
			</div>

			{/* Custom Overlay Children (e.g. Up Next) */}
			{children}

			{/* Processing Overlay */}
			{isProcessing && (
				<div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-4">
						<div className="relative w-16 h-16">
							<div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
							<div className="absolute inset-0 rounded-full border-4 border-t-orange-600 animate-spin"></div>
						</div>
						<div className="text-white text-lg font-medium">Processing Video...</div>
						<div className="text-white/60 text-sm">This might take a moment</div>
					</div>
				</div>
			)}

			{/* Gradient Overlay */}
			<div
				className={cn(
					'absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 pointer-events-none',
					showControls ? 'opacity-100' : 'opacity-0'
				)}
			/>

			{/* Controls Container */}
			<div className={cn('absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 flex flex-col gap-2 transition-opacity duration-300 z-30', showControls ? 'opacity-100' : 'opacity-0')}>
				{/* Progress Bar */}
				<div className="relative h-1 group/slider cursor-pointer flex items-center mb-2">
					{/* Background */}
					<div className="absolute inset-0 bg-white/20" />

					{/* Buffered */}
					<div className="absolute left-0 top-0 bottom-0 bg-white/40 transition-all duration-300" style={{ width: `${(buffered / (duration || 1)) * 100}%` }} />

					{/* Played */}
					<div className="absolute left-0 top-0 bottom-0 bg-orange-600 transition-all duration-100" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />

					{/* Input Range (Invisible but interactive) */}
					<input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />

					{/* Handle (Visible on hover/drag) */}
					<div
						className="absolute h-3.5 w-3.5 bg-orange-600 rounded-full scale-0 group-hover/slider:scale-100 transition-transform duration-200 pointer-events-none"
						style={{ left: `${(currentTime / (duration || 1)) * 100}%`, transform: 'translateX(-50%)' }}
					/>
				</div>

				<div className="flex items-center justify-between">
					{/* Left Controls */}
					<div className="flex items-center gap-4">
						<div className="relative group/tooltip">
							<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-full" onClick={togglePlay}>
								{isPlaying ? <Pause className="fill-white w-5 h-5" /> : <Play className="fill-white w-5 h-5" />}
							</Button>
							<VideoPlayerTooltip content={isPlaying ? 'Pause (k)' : 'Play (k)'} />
						</div>

						<div className="flex items-center gap-2 group/volume">
							<div className="relative group/tooltip">
								<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-full" onClick={toggleMute}>
									{isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : volume < 0.5 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
								</Button>
								<VideoPlayerTooltip content={isMuted ? 'Unmute (m)' : 'Mute (m)'} />
							</div>
							<input
								type="range"
								min={0}
								max={1}
								step={0.05}
								value={isMuted ? 0 : volume}
								onChange={handleVolumeChange}
								className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 accent-white h-1 bg-white/30 rounded-full"
							/>
						</div>

						<div className="text-white text-sm font-medium">
							{formatTime(currentTime)} / {formatTime(duration)}
						</div>
					</div>

					{/* Right Controls */}
					<div className="flex items-center gap-2">
						{showAutoplayToggle && (
							<div className="hidden md:flex items-center gap-2 mr-2 group/tooltip relative">
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" className="sr-only peer" checked={!!autoplayEnabled} onChange={(e) => onAutoplayChange?.(e.target.checked)} />
									<div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
								</label>
								<VideoPlayerTooltip content={`Autoplay is ${autoplayEnabled ? 'on' : 'off'}`} />
							</div>
						)}

						{/* Settings Menu */}
						<div className="relative group/tooltip">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 relative rounded-full">
										<Settings className={cn('w-5 h-5 transition-transform duration-300', showControls ? 'rotate-0' : 'rotate-90')} />
										{currentLevel !== -1 && <span className="absolute -top-0.5 -right-0.5 bg-orange-600 text-[10px] px-0.5 rounded-sm leading-tight">HD</span>}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									container={isFullscreen ? containerRef.current : null}
									side="top"
									align="end"
									className="w-64 bg-[#0f0f0f]/95 border-white/10 text-white backdrop-blur-md p-1.5 shadow-xl rounded-xl"
								>
									{showAutoplayToggle && (
										<DropdownMenuItem
											className="md:hidden flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg transition-colors outline-none"
											onClick={(e) => {
												e.preventDefault();
												onAutoplayChange?.(!autoplayEnabled);
											}}
										>
											<div className="flex items-center gap-2 w-full">
												<span>Autoplay</span>
												<div className="ml-auto relative inline-flex items-center cursor-pointer pointer-events-none">
													<div className={cn('w-9 h-5 bg-white/20 rounded-full transition-colors', autoplayEnabled && 'bg-orange-600')}>
														<div
															className={cn('absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-transform', autoplayEnabled && 'translate-x-full')}
														/>
													</div>
												</div>
											</div>
										</DropdownMenuItem>
									)}
									<DropdownMenuSub>
										<DropdownMenuSubTrigger className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg transition-colors outline-none">
											<div className="flex items-center gap-2 w-full">
												<span>Playback speed</span>
												<span className="text-white/50 text-sm ml-auto">{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</span>
											</div>
										</DropdownMenuSubTrigger>
										<DropdownMenuPortal container={isFullscreen ? containerRef.current : null}>
											<DropdownMenuSubContent className="w-48 bg-[#0f0f0f]/95 border-white/10 text-white backdrop-blur-md p-1.5 shadow-xl rounded-xl max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
												{speeds.map((speed) => (
													<DropdownMenuItem
														key={speed}
														className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg transition-colors outline-none"
														onClick={() => handleSpeedChange(speed)}
													>
														<div className="w-4 h-4 flex items-center justify-center shrink-0">{playbackRate === speed && <Check className="w-3.5 h-3.5" />}</div>
														<span>{speed === 1 ? 'Normal' : speed}</span>
													</DropdownMenuItem>
												))}
											</DropdownMenuSubContent>
										</DropdownMenuPortal>
									</DropdownMenuSub>

									<DropdownMenuSub>
										<DropdownMenuSubTrigger className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg transition-colors outline-none">
											<div className="flex items-center gap-2 w-full">
												<span>Quality</span>
												<span className="text-white/50 text-sm ml-auto">
													{currentLevel === -1 ? `Auto (${levels[hlsRef.current?.currentLevel || 0]?.height || '1080'}p)` : `${levels[currentLevel]?.height}p`}
												</span>
											</div>
										</DropdownMenuSubTrigger>
										<DropdownMenuPortal container={isFullscreen ? containerRef.current : null}>
											<DropdownMenuSubContent className="w-48 bg-[#0f0f0f]/95 border-white/10 text-white backdrop-blur-md p-1.5 shadow-xl rounded-xl max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
												<DropdownMenuItem
													className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg transition-colors outline-none"
													onClick={() => handleQualityChange(-1)}
												>
													<div className="w-4 h-4 flex items-center justify-center shrink-0">{currentLevel === -1 && <Check className="w-3.5 h-3.5" />}</div>
													<span>Auto</span>
												</DropdownMenuItem>
												{levels.map((level, index) => (
													<DropdownMenuItem
														key={index}
														className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-lg transition-colors outline-none"
														onClick={() => handleQualityChange(index)}
													>
														<div className="w-4 h-4 flex items-center justify-center shrink-0">{currentLevel === index && <Check className="w-3.5 h-3.5" />}</div>
														<span>
															{level.height}p {level.height >= 720 && <sup className="text-[10px] ml-0.5">HD</sup>}
															{level.height >= 2160 && <sup className="text-[10px] ml-0.5">4K</sup>}
														</span>
													</DropdownMenuItem>
												))}
											</DropdownMenuSubContent>
										</DropdownMenuPortal>
									</DropdownMenuSub>
								</DropdownMenuContent>
							</DropdownMenu>
							<VideoPlayerTooltip content="Settings" />
						</div>

						<div className="relative group/tooltip">
							<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-full" onClick={togglePiP}>
								<PictureInPicture className="w-5 h-5" />
							</Button>
							<VideoPlayerTooltip content="Picture in Picture (i)" />
						</div>

						<div className="relative group/tooltip hidden md:flex">
							<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-full" onClick={() => setTheaterMode(!theaterMode)}>
								<RectangleHorizontal className={cn('w-5 h-5', theaterMode ? 'fill-white' : '')} />
							</Button>
							<VideoPlayerTooltip content={theaterMode ? 'Default view (t)' : 'Theater mode (t)'} />
						</div>

						<div className="relative group/tooltip">
							<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-full" onClick={toggleFullscreen}>
								{isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
							</Button>
							<VideoPlayerTooltip content={isFullscreen ? 'Exit full screen (f)' : 'Full screen (f)'} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
