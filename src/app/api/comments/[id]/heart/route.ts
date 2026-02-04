import { comments, notifications } from '~server/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '~server/auth';
import { db } from '~server/db';

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const comment = await db.query.comments.findFirst({
			where: eq(comments.id, id),
			with: {
				video: true
			}
		});

		if (!comment) {
			return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
		}

		if (!comment.video) {
			return NextResponse.json({ error: 'Video not found' }, { status: 404 });
		}

		// Check if user is the owner of the video
		if (comment.video.userId !== session.user.id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const newStatus = !comment.isHearted;

		await db.update(comments).set({ isHearted: newStatus }).where(eq(comments.id, id));

		if (comment.userId !== session.user.id) {
			const notificationParams = {
				recipientId: comment.userId,
				senderId: session.user.id,
				type: 'COMMENT_HEART' as const,
				resourceId: comment.videoId,
				relatedCommentId: comment.id
			};

			if (!newStatus) {
				// Remove notification on un-heart
				await db
					.delete(notifications)
					.where(
						and(
							eq(notifications.recipientId, notificationParams.recipientId),
							eq(notifications.senderId, notificationParams.senderId),
							eq(notifications.type, notificationParams.type),
							eq(notifications.relatedCommentId, notificationParams.relatedCommentId)
						)
					);
			} else {
				// Check for existing notification before insert
				const existingNotification = await db.query.notifications.findFirst({
					where: and(
						eq(notifications.recipientId, notificationParams.recipientId),
						eq(notifications.senderId, notificationParams.senderId),
						eq(notifications.type, notificationParams.type),
						eq(notifications.relatedCommentId, notificationParams.relatedCommentId)
					)
				});

				if (!existingNotification) {
					await db.insert(notifications).values({
						...notificationParams,
						read: false
					});
				}
			}
		}

		return NextResponse.json({ isHearted: newStatus });
	} catch (error) {
		console.error('Error toggling heart:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
