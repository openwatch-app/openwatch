import { Video as FrontendVideo, Channel as FrontendChannel } from '~app/types';

export const formatDuration = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const mapUserToChannel = (user: any): FrontendChannel => {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		avatar: user.image || '',
		handle: user.handle || user.name,
		subscribers: '0', // Default, would need aggregation to get real count
		videosCount: '0',
		verified: user.verified || false,
		description: user.description || '',
		type: 'channel'
	};
};

export const mapVideoToFrontend = (video: any): FrontendVideo => {
	return {
		id: video.id,
		title: video.title || '',
		thumbnail: video.thumbnailUrl || '/placeholder.jpg',
		videoUrl: `/watch/${video.id}`,
		duration: video.duration ? formatDuration(video.duration) : '0:00',
		views: video.views?.toString() || '0',
		uploadedAt: video.createdAt?.toISOString() || new Date().toISOString(),
		description: video.description || '',
		category: video.category || 'General',
		type: video.isShort ? 'short' : 'video',
		isShort: video.isShort,
		status: video.status as any,
		visibility: video.visibility as any,
		likes: video.likes?.toString() || '0',
		dislikes: video.dislikes?.toString() || '0',
		savedProgress: video.savedProgress,
		durationInSeconds: video.duration || 0,
		channel: {
			id: video.user.id,
			name: video.user.name,
			avatar: video.user.image || '',
			handle: video.user.handle || video.user.name,
			email: video.user.email || '',
			subscribers: '0', // Default, as we might not have this data here
			videosCount: '0',
			verified: video.user.verified || false
		}
	};
};
