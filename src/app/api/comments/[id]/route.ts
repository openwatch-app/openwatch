import { db } from '~server/db';
import { comments } from '~server/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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

		// Allow delete if user is comment author OR video owner
		const isCommentAuthor = comment.userId === session.user.id;
		const isVideoOwner = comment.video && comment.video.userId === session.user.id;

		if (!isCommentAuthor && !isVideoOwner) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await db.delete(comments).where(eq(comments.id, id));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting comment:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
