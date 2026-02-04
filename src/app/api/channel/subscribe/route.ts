import { db } from '~server/db';
import { subscription, user } from '~server/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { generateId } from 'better-auth';

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

		if (channelId === userId) {
			return NextResponse.json({ error: 'Cannot subscribe to yourself' }, { status: 400 });
		}

		// Check if channel exists
		const channelExists = await db.query.user.findFirst({
			where: eq(user.id, channelId)
		});

		if (!channelExists) {
			return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
		}

		// Check if already subscribed
		const existingSubscription = await db.query.subscription.findFirst({
			where: and(eq(subscription.subscriberId, userId), eq(subscription.subscribedToId, channelId))
		});

		if (existingSubscription) {
			// Unsubscribe
			await db.delete(subscription).where(and(eq(subscription.subscriberId, userId), eq(subscription.subscribedToId, channelId)));
			return NextResponse.json({ subscribed: false });
		} else {
			// Subscribe
			try {
				await db.insert(subscription).values({
					id: generateId(),
					subscriberId: userId,
					subscribedToId: channelId
				});
				return NextResponse.json({ subscribed: true });
			} catch (error: any) {
				// Handle unique constraint violation (already subscribed)
				if (error.code === '23505') {
					return NextResponse.json({ subscribed: true });
				}
				throw error;
			}
		}
	} catch (error) {
		console.error('Error in subscription toggle:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
