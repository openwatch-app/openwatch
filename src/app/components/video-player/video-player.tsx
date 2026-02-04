'use client';

import { Play, Pause, Volume2, VolumeX, Volume1, Settings, Maximize, Minimize, PictureInPicture, Check, Volume } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '~components/button';
import { cn } from '~lib/utils';
import Hls from 'hls.js';
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
}

const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const VideoPlayer = ({ videoId, videoUrl, autoPlay = false }: VideoPlayerProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const hlsRef = useRef<Hls | null>(null);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);
	const [buffered, setBuffered] = useState(0);

	const [levels, setLevels] = useState<any[]>([]);
	const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto
	const [playbackRate, setPlaybackRate] = useState(1);
	const [isProcessing, setIsProcessing] = useState(false);

	// Initial HLS setup
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		// Add cache busting to URL
		const hlsSrc = `/api/stream/${videoId}/master.m3u8?t=${Date.now()}`;

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
											hls?.loadSource(hlsSrc);
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

				hls.loadSource(hlsSrc);
				hls.attachMedia(video);

				hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
					setLevels(hls?.levels || []);
					setIsProcessing(false);
					if (autoPlay) safePlay();
				});
			} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
				video.src = hlsSrc;
				if (autoPlay) safePlay();
			}
		};

		initHls();

		return () => {
			if (hls) {
				hls.destroy();
			}
		};
	}, [videoId, videoUrl, autoPlay]);

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
			}
		}
	}, []);

	const handleTimeUpdate = () => {
		if (videoRef.current) {
			setCurrentTime(videoRef.current.currentTime);
			if (!isNaN(videoRef.current.duration) && videoRef.current.duration !== Infinity) {
				setDuration(videoRef.current.duration);
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
		if (videoRef.current && !isNaN(videoRef.current.duration) && videoRef.current.duration !== Infinity) {
			setDuration(videoRef.current.duration);
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = parseFloat(e.target.value);
		if (videoRef.current) {
			videoRef.current.currentTime = time;
			setCurrentTime(time);
		}
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const vol = parseFloat(e.target.value);
		setVolume(vol);
		if (videoRef.current) {
			videoRef.current.volume = vol;
			setIsMuted(vol === 0);
		}
	};

	const toggleMute = () => {
		if (videoRef.current) {
			if (isMuted) {
				videoRef.current.volume = volume || 1;
				setIsMuted(false);
			} else {
				videoRef.current.volume = 0;
				setIsMuted(true);
			}
		}
	};

	const toggleFullscreen = () => {
		if (!containerRef.current) return;

		if (!document.fullscreenElement) {
			containerRef.current.requestFullscreen();
			setIsFullscreen(true);
		} else {
			document.exitFullscreen();
			setIsFullscreen(false);
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
		if (videoRef.current) {
			videoRef.current.playbackRate = speed;
			setPlaybackRate(speed);
		}
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
			if (isPlaying) setShowControls(false);
		}, 3000);
	};

	return (
		<div
			ref={containerRef}
			className="relative w-full aspect-video bg-black group overflow-hidden select-none"
			onMouseMove={handleMouseMove}
			onMouseLeave={() => isPlaying && setShowControls(false)}
		>
			<video
				ref={videoRef}
				className="w-full h-full object-contain"
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleLoadedMetadata}
				onClick={togglePlay}
				onDoubleClick={toggleFullscreen}
			/>

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
					'absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 pointer-events-none',
					showControls ? 'opacity-100' : 'opacity-0'
				)}
			/>

			{/* Controls Container */}
			<div className={cn('absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 flex flex-col gap-2 transition-opacity duration-300', showControls ? 'opacity-100' : 'opacity-0')}>
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
						<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-none" onClick={togglePlay}>
							{isPlaying ? <Pause className="fill-white w-5 h-5" /> : <Play className="fill-white w-5 h-5" />}
						</Button>

						<div className="flex items-center gap-2 group/volume">
							<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-none" onClick={toggleMute}>
								{isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : volume < 0.5 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
							</Button>
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
						{/* Settings Menu */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 relative rounded-none">
									<Settings className={cn('w-5 h-5 transition-transform duration-300', showControls ? 'rotate-0' : 'rotate-90')} />
									{currentLevel !== -1 && <span className="absolute -top-0.5 -right-0.5 bg-orange-600 text-[10px] px-0.5 rounded-sm leading-tight">HD</span>}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent side="top" align="end" className="w-64 bg-black/90 border-white/10 text-white backdrop-blur-md">
								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white">
										<div className="flex items-center gap-2 w-full">
											<span>Playback speed</span>
											<span className="text-white/50 text-sm ml-auto">{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</span>
										</div>
									</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent className="bg-black/90 border-white/10 text-white max-h-60 overflow-y-auto">
											{speeds.map((speed) => (
												<DropdownMenuItem
													key={speed}
													className="hover:bg-white/10 cursor-pointer gap-2 focus:bg-white/10 focus:text-white"
													onClick={() => handleSpeedChange(speed)}
												>
													{playbackRate === speed && <Check className="w-4 h-4" />}
													<span className={playbackRate === speed ? 'ml-0' : 'ml-6'}>{speed === 1 ? 'Normal' : speed}</span>
												</DropdownMenuItem>
											))}
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>

								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white">
										<div className="flex items-center gap-2 w-full">
											<span>Quality</span>
											<span className="text-white/50 text-sm ml-auto">
												{currentLevel === -1 ? `Auto (${levels[hlsRef.current?.currentLevel || 0]?.height || '1080'}p)` : `${levels[currentLevel]?.height}p`}
											</span>
										</div>
									</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent className="bg-black/90 border-white/10 text-white max-h-60 overflow-y-auto">
											<DropdownMenuItem className="hover:bg-white/10 cursor-pointer gap-2 focus:bg-white/10 focus:text-white" onClick={() => handleQualityChange(-1)}>
												{currentLevel === -1 && <Check className="w-4 h-4" />}
												<span className={currentLevel === -1 ? 'ml-0' : 'ml-6'}>Auto</span>
											</DropdownMenuItem>
											{levels.map((level, index) => (
												<DropdownMenuItem
													key={index}
													className="hover:bg-white/10 cursor-pointer gap-2 focus:bg-white/10 focus:text-white"
													onClick={() => handleQualityChange(index)}
												>
													{currentLevel === index && <Check className="w-4 h-4" />}
													<span className={currentLevel === index ? 'ml-0' : 'ml-6'}>
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

						<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-none" onClick={togglePiP}>
							<PictureInPicture className="w-5 h-5" />
						</Button>

						<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 rounded-none" onClick={toggleFullscreen}>
							{isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
