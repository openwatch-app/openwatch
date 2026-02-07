import { Video } from '~app/types';
import Link from 'next/link';
import Image from 'next/image';
import { MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '../button';
import { cn } from '~lib/utils';
import dayjs from 'dayjs';

interface PlaylistVideoItemProps {
	video: Video;
	index: number;
	isOwner: boolean;
	onRemove?: () => void;
}

export const PlaylistVideoItem = ({ video, index, isOwner, onRemove }: PlaylistVideoItemProps) => {
	return (
		<div className="flex gap-3 p-2 rounded-xl hover:bg-secondary/50 group items-center">
			{/* Index */}
			<div className="w-6 text-center text-sm text-muted-foreground font-medium shrink-0">{index + 1}</div>

			{/* Thumbnail */}
			<Link href={`/watch/${video.id}`} className="relative shrink-0 w-40 aspect-video rounded-lg overflow-hidden bg-black/10">
				<Image src={video.thumbnail || '/images/no-thumbnail.jpg'} alt={video.title} fill className="object-cover" />
				<div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded font-medium">{video.duration}</div>
			</Link>

			{/* Info */}
			<div className="flex-1 min-w-0 flex flex-col justify-center">
				<Link href={`/watch/${video.id}`}>
					<h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">{video.title}</h3>
				</Link>
				<div className="flex flex-col sm:flex-row sm:items-center text-xs text-muted-foreground gap-1 sm:gap-2">
					<Link href={`/channel/${video.channel.handle || video.channel.id}`} className="hover:text-foreground">
						{video.channel.name}
					</Link>
					<span className="hidden sm:inline">•</span>
					<span>{video.views} views</span>
					<span>•</span>
					<span>{dayjs(video.uploadedAt).fromNow()}</span>
				</div>
			</div>

			{/* Actions */}
			<div className="shrink-0">
				{isOwner && onRemove ? (
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
						onClick={(e) => {
							e.preventDefault();
							onRemove();
						}}
						title="Remove from playlist"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				) : (
					<Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
						<MoreVertical className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
};
