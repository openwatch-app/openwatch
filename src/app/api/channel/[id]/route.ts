import { db } from '~server/db';
import { subscription, user, videos } from '~server/db/schema';
import { eq, or, and, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { RecommendationService } from '~server/services/recommendations';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!id) {
			return NextResponse.json({ error: 'Missing ID or Handle' }, { status: 400 });
		}

		// Decode URL in case of @ or other special chars
		const decodedId = decodeURIComponent(id);

		// Handle External Channel
		if (decodedId.startsWith('external:')) {
			const parts = decodedId.split(':');
			if (parts.length === 3) {
				const [_, host, username] = parts;
				const handle = `${username}@${host}`;
				const externalChannel = await RecommendationService.resolveExternalIdentity(handle);

				if (externalChannel) {
					return NextResponse.json({
						...externalChannel,
						avatar: externalChannel.image,
						// Use externalChannel stats if available, otherwise default to 0
						subscribers: externalChannel.subscribers || '0',
						videosCount: externalChannel.videosCount || '0',
						isSubscribed: false,
						notify: false
					});
				}
			}
			return NextResponse.json({ error: 'External channel not found' }, { status: 404 });
		}

		// Find user by ID or Handle
		const result = await db.query.user.findFirst({
			where: or(eq(user.id, decodedId), eq(user.handle, decodedId))
		});

		if (!result) {
			// Attempt to resolve as external handle if federation is enabled
			if (process.env.NEXT_PUBLIC_ENABLE_FEDERATION === 'true' && decodedId.includes('@')) {
				const externalChannel = await RecommendationService.resolveExternalIdentity(decodedId);
				if (externalChannel) {
					return NextResponse.json({
						...externalChannel,
						avatar: externalChannel.image,
						// Use externalChannel stats if available, otherwise default to 0
						subscribers: externalChannel.subscribers || '0',
						videosCount: externalChannel.videosCount || '0',
						isSubscribed: false,
						notify: false
					});
				}
			}

			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Get subscriber count
		const subscriberCountResult = await db.select({ value: count() }).from(subscription).where(eq(subscription.subscribedToId, result.id));

		const subscriberCount = subscriberCountResult[0]?.value || 0;

		// Get video count
		const videoCountResult = await db.select({ value: count() }).from(videos).where(eq(videos.userId, result.id));
		const videoCount = videoCountResult[0]?.value || 0;

		// Check if current user is subscribed
		let isSubscribed = false;
		let notify = false;
		if (session?.user) {
			const sub = await db.query.subscription.findFirst({
				where: and(eq(subscription.subscriberId, session.user.id), eq(subscription.subscribedToId, result.id))
			});
			if (sub) {
				isSubscribed = true;
				notify = sub.notify;
			}
		}

		// Map user fields to match the expected Channel interface in frontend
		const channelData = {
			...result,
			avatar: result.image, // frontend expects 'avatar'
			subscribers: subscriberCount.toString(),
			videosCount: videoCount.toString(),
			isSubscribed,
			notify
		};

		return NextResponse.json(channelData);
	} catch (error) {
		console.error('Error fetching channel (user):', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
