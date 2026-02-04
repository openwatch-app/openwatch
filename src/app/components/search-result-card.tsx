import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { MoreVertical } from 'lucide-react';
import { Button } from './button';
import { Video } from '../types';
import Link from 'next/link';
import Image from 'next/image';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface SearchResultCardProps {
	video: Video;
}

const SearchResultCard = ({ video }: SearchResultCardProps) => {
	return (
		<div className="flex flex-col md:flex-row gap-4 w-full group">
			{/* Thumbnail Container */}
			<Link href={`/watch/${video.id}`} className="relative shrink-0 w-full md:w-[360px] aspect-video rounded-xl overflow-hidden">
				<Image
					src={video.thumbnail || '/placeholder.jpg'}
					alt={video.title}
					fill
					className="object-cover transition-transform duration-300 group-hover:scale-105"
					sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
					priority={false}
				/>
				<div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded font-medium z-10">{video.duration}</div>
			</Link>

			{/* Info */}
			<div className="flex flex-col flex-1 gap-1 min-w-0">
				<div className="flex justify-between items-start gap-2">
					<Link href={`/watch/${video.id}`}>
						<h3 className="font-normal text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">{video.title}</h3>
					</Link>
					<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100">
						<MoreVertical className="h-5 w-5" />
					</Button>
				</div>

				<div className="text-xs text-muted-foreground flex items-center mb-2">
					<span>{video.views} views</span>
					<span className="mx-1">•</span>
					<span>{dayjs(video.uploadedAt).fromNow()}</span>
				</div>

				<div className="flex items-center gap-2 mb-2">
					<Link href={`/channel/${video.channel.handle || video.channel.id}`} className="shrink-0">
						<Avatar className="h-6 w-6">
							<AvatarImage src={video.channel.avatar} />
							<AvatarFallback>{video.channel.name[0]}</AvatarFallback>
						</Avatar>
					</Link>
					<Link href={`/channel/${video.channel.handle || video.channel.id}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
						{video.channel.name}
					</Link>
				</div>

				<p className="text-xs text-muted-foreground line-clamp-2 hidden md:block">
					{video.description}
				</p>
			</div>
		</div>
	);
};

export default SearchResultCard;
