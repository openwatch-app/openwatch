import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { MoreVertical } from 'lucide-react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Video } from '../types';
import Link from 'next/link';
import Image from 'next/image';
import dayjs from 'dayjs';

interface VideoCardProps {
	video: Video;
}

const safeFromNow = (input: string | Date) => {
	const ts = dayjs(input);
	if (!ts.isValid()) return '';
	const now = dayjs();
	const futureOffset = ts.diff(now);
	return ts.subtract(futureOffset > 0 ? futureOffset : 0, 'ms').fromNow();
};

const VideoCard = ({ video }: VideoCardProps) => {
	return (
		<Card className="border-0 bg-transparent shadow-none">
			<CardContent className="p-0">
				{/* Thumbnail Container */}
				<Link href={`/watch/${video.id}`} className="relative aspect-video rounded-xl overflow-hidden mb-2 group block w-full">
					<Image
						src={video.thumbnail || '/images/no-video.jpg'}
						alt={video.title}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-105"
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
						priority={false}
					/>
					<div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded font-medium z-10">{video.duration}</div>
					{video.savedProgress !== undefined && video.savedProgress > 0 && video.durationInSeconds && video.durationInSeconds > 0 && (
						<div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600/50 z-10">
							<div className="h-full bg-orange-600" style={{ width: `${Math.min((video.savedProgress / video.durationInSeconds) * 100, 100)}%` }} />
						</div>
					)}
				</Link>

				{/* Info */}
				<div className="flex gap-2 mt-5">
					<Link href={`/channel/${video.channel.handle || video.channel.id}`} className="shrink-0">
						<Avatar className="h-9 w-9">
							<AvatarImage src={video.channel.avatar} />
							<AvatarFallback>{video.channel.name[0]}</AvatarFallback>
						</Avatar>
					</Link>

					<div className="flex flex-col flex-1 gap-1">
						<div className="flex justify-between items-start gap-2">
							<Link href={`/watch/${video.id}`}>
								<h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">{video.title}</h3>
							</Link>
							<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</div>

						<div className="text-sm text-muted-foreground">
							<Link href={`/channel/${video.channel.handle || video.channel.id}`} className="hover:text-foreground transition-colors block">
								{video.channel.name}
							</Link>
							<div className="flex items-center">
								<span>{video.views} views</span>
								<span className="mx-1">•</span>
								<span>{safeFromNow(video.uploadedAt)}</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default VideoCard;
