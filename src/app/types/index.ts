export interface Channel {
	id: string;
	name: string;
	email: string;
	image?: string;
	avatar: string; // Mapped from image in API
	handle: string;
	banner?: string;
	description?: string;
	subscribers: string;
	videosCount: string;
	verified: boolean;
	links?: { title: string; url: string }[];
	isSubscribed?: boolean;
	notify?: boolean;
	type?: 'channel';
	isExternal?: boolean;
	host?: string;
}

export interface Video {
	id: string;
	title: string;
	thumbnail: string;
	videoUrl?: string; // For the player
	duration: string;
	views: string;
	uploadedAt: string;
	channel: Channel;
	description?: string;
	category: string;
	type: 'video' | 'short';
	isShort?: boolean;
	likes?: string;
	dislikes?: string;
	userReaction?: 'LIKE' | 'DISLIKE' | null;
	status?: 'processing' | 'ready' | 'failed';
	visibility?: 'public' | 'private' | 'unlisted' | 'draft';
	restrictions?: string;
	savedProgress?: number;
	durationInSeconds?: number;
	isExternal?: boolean;
}

export interface Comment {
	id: string;
	user: {
		id: string;
		name: string;
		avatar: string;
		handle: string;
	};
	content: string;
	likes: number;
	dislikes: number;
	userReaction?: 'LIKE' | 'DISLIKE' | null;
	timestamp: string;
	isPinned: boolean;
	isHearted: boolean;
	replies?: Comment[];
	parentId?: string | null;
	createdAt: string;
}

export interface Category {
	id: string;
	name: string;
}

export interface SidebarItem {
	icon: React.ElementType;
	label: string;
	href: string;
	isActive?: boolean;
}
