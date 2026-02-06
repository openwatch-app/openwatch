import { Video } from '~app/types';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '~lib/utils';
import { Play, X } from 'lucide-react';
import { Button } from '../button';

interface Playlist {
	id: string;
	title: string;
	user: {
		id: string;
		name: string;
	};
	videos: (Video & { playlistItemId: string })[];
}

interface PlaylistSidebarProps {
	playlist: Playlist;
	currentVideoId: string;
	onClose: () => void;
}

export const PlaylistSidebar = ({ playlist, currentVideoId, onClose }: PlaylistSidebarProps) => {
	const currentIndex = playlist.videos.findIndex((v) => v.id === currentVideoId);
	const displayIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

	return (
		<div className="border border-border/50 rounded-xl overflow-hidden bg-background flex flex-col max-h-[600px]">
			{/* Header */}
			<div className="p-4 bg-secondary/30 border-b border-border/50">
				<div className="flex items-start justify-between gap-2">
					<div>
						<h3 className="font-bold text-lg leading-tight line-clamp-2">{playlist.title}</h3>
						<div className="text-xs text-muted-foreground mt-1">
							{playlist.user.name} • {displayIndex} / {playlist.videos.length}
						</div>
					</div>
					<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
						<X className="w-4 h-4" />
					</Button>
				</div>
			</div>

			{/* List */}
			<div className="overflow-y-auto flex-1 p-2 space-y-1">
				{playlist.videos.map((video, index) => {
					const isCurrent = video.id === currentVideoId;
					return (
						<Link
							key={video.playlistItemId}
							href={`/watch/${video.id}?list=${playlist.id}`}
							className={cn('flex gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors group', isCurrent && 'bg-secondary/80 hover:bg-secondary/80')}
						>
							<div className="flex items-center text-xs text-muted-foreground w-6 shrink-0 justify-center">
								{isCurrent ? <Play className="w-3 h-3 fill-current text-primary" /> : index + 1}
							</div>

							<div className="relative w-24 aspect-video rounded overflow-hidden shrink-0 bg-secondary">
								<Image src={video.thumbnail || '/placeholder.jpg'} alt={video.title} fill className="object-cover" />
								<div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">{video.duration}</div>
							</div>

							<div className="flex-1 min-w-0 flex flex-col justify-center">
								<h4 className={cn('text-sm font-medium line-clamp-2 leading-tight', isCurrent && 'text-primary')}>{video.title}</h4>
								<div className="text-xs text-muted-foreground mt-0.5">{video.channel.name}</div>
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
};
