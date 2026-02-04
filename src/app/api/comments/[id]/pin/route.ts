import { db } from '~server/db';
import { comments } from '~server/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params; // comment id
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

		// Toggle pin
		const newStatus = !comment.isPinned;

		await db.transaction(async (tx) => {
			// If pinning, unpin any other pinned comment on this video
			if (newStatus) {
				await tx.update(comments).set({ isPinned: false }).where(eq(comments.videoId, comment.videoId));
			}

			await tx.update(comments).set({ isPinned: newStatus }).where(eq(comments.id, id));
		});

		return NextResponse.json({ isPinned: newStatus });
	} catch (error) {
		console.error('Error toggling pin:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
