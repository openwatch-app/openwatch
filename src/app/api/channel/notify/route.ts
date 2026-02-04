import { db } from '~server/db';
import { subscription, user } from '~server/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';

export const POST = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { channelId } = await req.json();
		const userId = session.user.id;

		if (!channelId) {
			return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
		}

		// Check if subscription exists
		const existingSubscription = await db.query.subscription.findFirst({
			where: and(eq(subscription.subscriberId, userId), eq(subscription.subscribedToId, channelId))
		});

		if (!existingSubscription) {
			return NextResponse.json({ error: 'Not subscribed to this channel' }, { status: 400 });
		}

		// Toggle notify
		const newNotifyStatus = !existingSubscription.notify;

		await db
			.update(subscription)
			.set({ notify: newNotifyStatus })
			.where(and(eq(subscription.subscriberId, userId), eq(subscription.subscribedToId, channelId)));

		return NextResponse.json({ notify: newNotifyStatus });
	} catch (error) {
		console.error('Error toggling notification:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
