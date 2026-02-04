import { db } from '~server/db';
import { subscription, user } from '~server/db/schema';
import { eq, count, getTableColumns } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async (req: NextRequest) => {
	try {
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get('page') || '1');
		const pageSize = parseInt(searchParams.get('pageSize') || '20');

		const limit = Math.min(Math.max(pageSize, 1), 100);
		const offset = (Math.max(page, 1) - 1) * limit;

		// Get total count
		const totalResult = await db.select({ count: count() }).from(user);
		const total = totalResult[0]?.count || 0;

		// Get users with subscriber count in a single query
		const usersWithCount = await db
			.select({
				...getTableColumns(user),
				subscriberCount: count(subscription.id)
			})
			.from(user)
			.leftJoin(subscription, eq(subscription.subscribedToId, user.id))
			.groupBy(user.id)
			.limit(limit)
			.offset(offset);

		const channels = usersWithCount.map((u) => ({
			...u,
			avatar: u.image,
			subscribers: u.subscriberCount.toString()
		}));

		return NextResponse.json({
			data: channels,
			pagination: {
				page,
				pageSize: limit,
				total,
				totalPages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Error fetching channels (users):', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
