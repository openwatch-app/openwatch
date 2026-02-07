import Link from 'next/link';
import Image from 'next/image';
import { ListPlus, Lock, Globe, EyeOff, Play } from 'lucide-react';
import { cn } from '~lib/utils';
import dayjs from 'dayjs';

interface PlaylistCardProps {
	playlist: {
		id: string;
		title: string;
		visibility: 'public' | 'private' | 'unlisted';
		updatedAt: string;
		videoCount: number;
		firstVideoThumbnail: string | null;
	};
}

export const PlaylistCard = ({ playlist }: PlaylistCardProps) => {
	return (
		<div className="flex flex-col gap-2 group cursor-pointer">
			{/* Thumbnail */}
			<Link href={`/playlist/${playlist.id}`} className="relative aspect-video rounded-xl overflow-hidden bg-secondary/50">
				<Image src={playlist.firstVideoThumbnail || '/images/no-thumbnail.jpg'} alt={playlist.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />

				{/* Overlay for playlist count */}
				<div className="absolute inset-y-0 right-0 w-1/3 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-1">
					<span className="font-bold text-lg">{playlist.videoCount}</span>
					<ListPlus className="w-5 h-5" />
				</div>

				{/* Hover overlay with Play All */}
				<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
					<div className="flex items-center gap-2 text-white font-medium">
						<Play className="w-4 h-4 fill-current" />
						<span>PLAY ALL</span>
					</div>
				</div>
			</Link>

			{/* Info */}
			<div className="flex flex-col gap-1 mt-2">
				<Link href={`/playlist/${playlist.id}`}>
					<h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">{playlist.title}</h3>
				</Link>
				<div className="flex flex-col gap-0.5">
					<div className="text-xs text-muted-foreground flex items-center gap-1">
						<span className="capitalize">{playlist.visibility}</span>
						<span>•</span>
						<span>Playlist</span>
					</div>
					<span className="text-xs text-muted-foreground">Updated {dayjs(playlist.updatedAt).fromNow()}</span>
					<Link href={`/playlist/${playlist.id}`} className="text-xs font-medium text-muted-foreground hover:text-foreground mt-1">
						View full playlist
					</Link>
				</div>
			</div>
		</div>
	);
};
