import React, { useEffect, useState } from 'react';
import { Button } from '~components/button';
import { Play, X } from 'lucide-react';
import Image from 'next/image';
import { Video } from '~app/types';

interface UpNextOverlayProps {
	nextVideo: Video;
	onCancel: () => void;
	onPlayNow: () => void;
	autoPlayEnabled: boolean;
	seconds?: number;
}

export const UpNextOverlay = ({ nextVideo, onCancel, onPlayNow, autoPlayEnabled, seconds = 8 }: UpNextOverlayProps) => {
	const [countdown, setCountdown] = useState(seconds);
	const [isCancelled, setIsCancelled] = useState(false);

	useEffect(() => {
		if (!autoPlayEnabled || isCancelled) return;

		if (countdown === 0) {
			onPlayNow();
			return;
		}

		const timer = setTimeout(() => {
			setCountdown((prev) => prev - 1);
		}, 1000);

		return () => clearTimeout(timer);
	}, [countdown, autoPlayEnabled, isCancelled, onPlayNow]);

	const handleCancel = () => {
		setIsCancelled(true);
		onCancel();
	};

	if (!nextVideo) return null;

	return (
		<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center animate-in fade-in duration-300">
			<div className="flex flex-col items-center max-w-lg w-full gap-4">
				<div className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">Up next {autoPlayEnabled && !isCancelled ? `in ${countdown}` : ''}</div>

				<div className="relative aspect-video w-full max-w-sm rounded-xl overflow-hidden shadow-2xl group cursor-pointer" onClick={onPlayNow}>
					<Image src={nextVideo.thumbnail} alt={nextVideo.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
					<div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
					<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
						<div className="bg-black/60 rounded-full p-3 backdrop-blur-sm">
							<Play className="w-8 h-8 fill-white text-white" />
						</div>
					</div>
				</div>

				<div className="space-y-1">
					<h3 className="text-white font-bold text-lg line-clamp-1">{nextVideo.title}</h3>
					<p className="text-white/60 text-sm">{nextVideo.channel.name}</p>
				</div>

				<div className="flex items-center gap-3 mt-4 w-full justify-center">
					<Button variant="secondary" className="min-w-[120px] rounded-full bg-white/10 hover:bg-white/20 text-white border-none h-10" onClick={handleCancel}>
						CANCEL
					</Button>
					<Button className="min-w-[120px] rounded-full bg-white text-black hover:bg-white/90 h-10" onClick={onPlayNow}>
						PLAY NOW
					</Button>
				</div>
			</div>
		</div>
	);
};
