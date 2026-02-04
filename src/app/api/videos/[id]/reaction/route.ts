import { db } from '~server/db';
import { videoReactions, videos } from '~server/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { generateId } from 'better-auth';

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { type } = await req.json();

		if (!['LIKE', 'DISLIKE'].includes(type)) {
			return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
		}

		const userId = session.user.id;

		// Check if video exists
		const video = await db.query.videos.findFirst({
			where: eq(videos.id, id)
		});

		if (!video) {
			return NextResponse.json({ error: 'Video not found' }, { status: 404 });
		}

		// Check if reaction exists
		const existingReaction = await db.query.videoReactions.findFirst({
			where: and(eq(videoReactions.videoId, id), eq(videoReactions.userId, userId))
		});

		if (existingReaction) {
			if (existingReaction.type === type) {
				// Toggle off (remove reaction)
				await db.delete(videoReactions).where(eq(videoReactions.id, existingReaction.id));
				return NextResponse.json({ reaction: null });
			} else {
				// Change reaction
				await db.update(videoReactions).set({ type }).where(eq(videoReactions.id, existingReaction.id));
				return NextResponse.json({ reaction: type });
			}
		} else {
			// Create new reaction
			await db.insert(videoReactions).values({
				id: generateId(),
				videoId: id,
				userId,
				type
			});
			return NextResponse.json({ reaction: type });
		}
	} catch (error) {
		console.error('Error toggling reaction:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
