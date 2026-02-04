import { db } from '~server/db';
import { subscription, user } from '~server/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json([]);
		}

		const userId = session.user.id;

		const userSubscriptions = await db.query.subscription.findMany({
			where: eq(subscription.subscriberId, userId),
			with: {
				subscribedTo: true
			}
		});

		// Map to channel format
		const channels = userSubscriptions.map((sub) => ({
			id: sub.subscribedTo.id,
			name: sub.subscribedTo.name,
			handle: sub.subscribedTo.handle,
			avatar: sub.subscribedTo.image,
			banner: sub.subscribedTo.banner,
			description: sub.subscribedTo.description,
			verified: sub.subscribedTo.verified,
			subscribers: '0',
			videosCount: '0',
			email: ''
		}));

		return NextResponse.json(channels);
	} catch (error) {
		console.error('Error fetching user subscriptions:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
