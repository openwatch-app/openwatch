import Link from 'next/link';
import Image from 'next/image';
import { ListPlus } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTranslation } from '~lib/i18n';
import { useAppStore } from '~lib/store';

dayjs.extend(relativeTime);

interface PlaylistResultCardProps {
	playlist: {
		id: string;
		title: string;
		videoCount: number;
		firstVideoThumbnail: string | null;
		updatedAt: string | Date;
		isExternal?: boolean;
		host?: string;
		owner?: {
			name: string;
			handle: string;
		};
		type: 'playlist';
	};
}

const PlaylistResultCard = ({ playlist }: PlaylistResultCardProps) => {
	const { t } = useTranslation();
	const { language } = useAppStore();

	const safeFromNow = (input: string | Date) => {
		const ts = dayjs(input).locale(language);
		if (!ts.isValid()) return '';
		const now = dayjs().locale(language);
		const futureOffset = ts.diff(now);
		return ts.subtract(futureOffset > 0 ? futureOffset : 0, 'ms').fromNow();
	};

	return (
		<div className="flex flex-col md:flex-row gap-4 w-full group">
			{/* Thumbnail Container */}
			<Link href={`/playlist/${playlist.id}`} className="relative shrink-0 w-full md:w-[360px] aspect-video rounded-xl overflow-hidden bg-secondary/50">
				<Image src={playlist.firstVideoThumbnail || '/images/no-thumbnail.jpg'} alt={playlist.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />

				{/* Playlist Overlay */}
				<div className="absolute inset-y-0 right-0 w-1/3 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-1 z-10">
					<span className="font-bold text-lg">{playlist.videoCount}</span>
					<ListPlus className="w-5 h-5" />
				</div>
			</Link>

			{/* Info */}
			<div className="flex flex-col flex-1 gap-1 min-w-0">
				<Link href={`/playlist/${playlist.id}`}>
					<h3 className="font-normal text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">{playlist.title}</h3>
				</Link>

				<div className="text-xs text-muted-foreground flex items-center mb-2">
					<span>{t('common.playlist')}</span>
					<span className="mx-1">•</span>
					{playlist.isExternal && playlist.host ? (
						<>
							<span className="text-xs bg-muted px-1.5 py-0.5 rounded">
								{t('search.filters.source')}: {playlist.host}
							</span>
							<span className="mx-1">•</span>
						</>
					) : null}
					<span>
						{t('common.updated')} {safeFromNow(playlist.updatedAt)}
					</span>
				</div>

				{playlist.owner && <div className="text-sm text-muted-foreground mt-1">{playlist.owner.name}</div>}

				<Link href={`/playlist/${playlist.id}`} className="text-xs font-medium mt-2 hover:text-primary uppercase tracking-wide">
					{t('common.view_full_playlist')}
				</Link>
			</div>
		</div>
	);
};

export default PlaylistResultCard;
