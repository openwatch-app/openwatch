import { NextRequest, NextResponse } from 'next/server';
import { db } from '~server/db';
import { user, videos, comments } from '~server/db/schema';
import { count, eq, sum, gt } from 'drizzle-orm';
import { auth } from '~server/auth';

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
		
        // Type assertion as 'role' is dynamically added
        const userRole = (session?.user as any)?.role;

		if (!session || userRole !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		const [userTotal] = await db.select({ value: count() }).from(user);
		
		// Calculate active users (updated in the last 30 days)
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const [userActive] = await db.select({ value: count() }).from(user).where(gt(user.lastActiveAt, thirtyDaysAgo));

		const [videoTotal] = await db.select({ value: count() }).from(videos);
		const [videoPublic] = await db.select({ value: count() }).from(videos).where(eq(videos.visibility, 'public'));
		
		const [viewsResult] = await db.select({ value: sum(videos.views) }).from(videos);
		const [commentTotal] = await db.select({ value: count() }).from(comments);

		return NextResponse.json({
			users: {
				total: userTotal?.value || 0,
				active: userActive?.value || 0
			},
			videos: {
				total: videoTotal?.value || 0,
				public: videoPublic?.value || 0
			},
			views: Number(viewsResult?.value) || 0,
			comments: commentTotal?.value || 0
		});
	} catch (error) {
		console.error('Error fetching admin stats:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
