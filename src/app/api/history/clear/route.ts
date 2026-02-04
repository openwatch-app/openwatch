import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { db } from '~server/db';
import { videoViews, watchHistory } from '~server/db/schema';
import { eq } from 'drizzle-orm';

export const DELETE = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		await db.transaction(async (tx) => {
			await tx.delete(watchHistory).where(eq(watchHistory.userId, session.user.id));
			await tx.delete(videoViews).where(eq(videoViews.userId, session.user.id));
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error clearing history:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
