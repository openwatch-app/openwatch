import { db } from '~server/db';
import { videos, user, videoReactions, comments } from '~server/db/schema';
import { eq, desc, or, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { RecommendationService } from '~server/services/recommendations';
import { mapVideoToFrontend } from '~server/mappers';

dayjs.extend(duration);

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json({ error: 'Missing ID or Handle' }, { status: 400 });
		}

		const decodedId = decodeURIComponent(id);

		// Handle External Channel by ID (external:host:username)
		if (decodedId.startsWith('external:')) {
			const parts = decodedId.split(':');
			if (parts.length === 3) {
				const [_, host, username] = parts;
				const remoteVideos = await RecommendationService.getRemoteChannelVideos(host, username);
				// Map using the shared mapper
				const mappedRemoteVideos = remoteVideos.map(mapVideoToFrontend);
				return NextResponse.json(mappedRemoteVideos);
			}
			return NextResponse.json([]);
		}

		// Find user by ID or Handle
		const channelUser = await db.query.user.findFirst({ where: or(eq(user.id, decodedId), eq(user.handle, decodedId)) });

		if (!channelUser) {
			// If it looks like an external handle, attempt to resolve and fetch
			if (decodedId.includes('@') && process.env.NEXT_PUBLIC_ENABLE_FEDERATION === 'true') {
				// Parse handle to get host and username
				const handle = decodedId.startsWith('@') ? decodedId.substring(1) : decodedId;
				const parts = handle.split('@');
				if (parts.length === 2) {
					const [username, host] = parts;
					const remoteVideos = await RecommendationService.getRemoteChannelVideos(host, username);
					const mappedRemoteVideos = remoteVideos.map(mapVideoToFrontend);
					return NextResponse.json(mappedRemoteVideos);
				}
				return NextResponse.json([]);
			}
			return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
		}

		// Fetch videos
		const channelVideos = await db.query.videos.findMany({
			where: eq(videos.userId, channelUser.id),
			orderBy: [desc(videos.createdAt)]
		});

		const videoIds = channelVideos.map((v) => v.id);
		let reactionsMap = new Map();
		let commentsMap = new Map();

		if (videoIds.length > 0) {
			// Fetch reactions counts
			const reactionsStats = await db
				.select({
					videoId: videoReactions.videoId,
					likes: sql<number>`cast(count(case when ${videoReactions.type} = 'LIKE' then 1 end) as int)`,
					dislikes: sql<number>`cast(count(case when ${videoReactions.type} = 'DISLIKE' then 1 end) as int)`
				})
				.from(videoReactions)
				.where(inArray(videoReactions.videoId, videoIds))
				.groupBy(videoReactions.videoId);

			// Fetch comments counts
			const commentsStats = await db
				.select({
					videoId: comments.videoId,
					count: sql<number>`cast(count(${comments.id}) as int)`
				})
				.from(comments)
				.where(inArray(comments.videoId, videoIds))
				.groupBy(comments.videoId);

			reactionsMap = new Map(reactionsStats.map((s) => [s.videoId, s]));
			commentsMap = new Map(commentsStats.map((s) => [s.videoId, s.count]));
		}

		// Map to Video interface
		const mappedVideos = channelVideos.map((v) => {
			const r = reactionsMap.get(v.id) || { likes: 0, dislikes: 0 };
			const c = commentsMap.get(v.id) || 0;

			return {
				id: v.id,
				title: v.title || 'Untitled',
				thumbnail: v.thumbnailUrl || '/images/no-thumbnail.jpg',
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
				type: v.isShort ? 'short' : 'video',
				visibility: v.visibility,
				restrictions: v.restrictions,
				isShort: v.isShort,
				likes: r.likes.toString(),
				dislikes: r.dislikes.toString(),
				commentsCount: c.toString()
			};
		});

		return NextResponse.json(mappedVideos);
	} catch (error) {
		console.error('Error fetching videos:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
