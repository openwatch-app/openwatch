import { notifications, videos, comments } from '~server/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '~server/db';
import { auth } from '~server/auth';

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;

		const userNotifications = await db.query.notifications.findMany({
			where: eq(notifications.recipientId, userId),
			orderBy: [desc(notifications.createdAt)],
			limit: 20,
			with: {
				sender: true
			}
		});

		if (userNotifications.length === 0) {
			return NextResponse.json([]);
		}

		// Collect IDs
		const videoIds = [...new Set(userNotifications.map((n) => n.resourceId))];
		const commentIds = [...new Set(userNotifications.map((n) => n.relatedCommentId).filter(Boolean) as string[])];

		// Fetch related data
		const [relatedVideos, relatedComments] = await Promise.all([
			videoIds.length > 0
				? db.query.videos.findMany({
						where: inArray(videos.id, videoIds),
						columns: { id: true, title: true, thumbnailUrl: true }
					})
				: [],
			commentIds.length > 0
				? db.query.comments.findMany({
						where: inArray(comments.id, commentIds),
						columns: { id: true, content: true }
					})
				: []
		]);

		const videoMap = new Map(relatedVideos.map((v) => [v.id, v]));
		const commentMap = new Map(relatedComments.map((c) => [c.id, c]));

		// Map to frontend friendly format
		const formattedNotifications = userNotifications.map((n) => {
			const video = videoMap.get(n.resourceId);
			const comment = n.relatedCommentId ? commentMap.get(n.relatedCommentId) : null;

			return {
				id: n.id,
				type: n.type,
				resourceId: n.resourceId,
				isRead: n.read,
				createdAt: n.createdAt,
				sender: n.sender
					? {
							id: n.sender.id,
							name: n.sender.name,
							avatar: n.sender.image || ''
						}
					: {
							id: null,
							name: 'Deleted user',
							avatar: ''
						},
				video: video
					? {
							title: video.title,
							thumbnail: video.thumbnailUrl
						}
					: null,
				comment: comment
					? {
							content: comment.content,
							id: n.relatedCommentId
						}
					: null
			};
		});

		return NextResponse.json(formattedNotifications);
	} catch (error) {
		console.error('Error fetching notifications:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
