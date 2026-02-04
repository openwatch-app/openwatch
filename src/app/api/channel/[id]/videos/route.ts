import { db } from '~server/db';
import { videos, user } from '~server/db/schema';
import { eq, desc, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json({ error: 'Missing ID or Handle' }, { status: 400 });
		}

		const decodedId = decodeURIComponent(id);

		// Find user by ID or Handle
		const channelUser = await db.query.user.findFirst({
			where: or(eq(user.id, decodedId), eq(user.handle, decodedId), eq(user.handle, decodedId.startsWith('@') ? decodedId : `@${decodedId}`))
		});

		if (!channelUser) {
			return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
		}

		// Fetch videos
		const channelVideos = await db.query.videos.findMany({
			where: eq(videos.userId, channelUser.id),
			orderBy: [desc(videos.createdAt)]
		});

		// Map to Video interface
		const mappedVideos = channelVideos.map((v) => ({
			id: v.id,
			title: v.title || 'Untitled',
			thumbnail: v.thumbnailUrl || '/placeholder.jpg',
			duration: v.duration ? `${Math.floor(dayjs.duration(v.duration, 'seconds').asMinutes())}:${dayjs.duration(v.duration, 'seconds').seconds().toString().padStart(2, '0')}` : '00:00',
			views: v.views.toString(),
			uploadedAt: v.createdAt.toISOString(),
			channel: {
				id: channelUser.id,
				name: channelUser.name,
				avatar: channelUser.image || '',
				handle: channelUser.handle || '',
				subscribers: '0', // Not fetching count here for performance
				videosCount: '0',
				verified: channelUser.verified
			},
			description: v.description,
			category: 'General',
			type: 'video',
			visibility: v.visibility,
			restrictions: v.restrictions
		}));

		return NextResponse.json(mappedVideos);
	} catch (error) {
		console.error('Error fetching videos:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
