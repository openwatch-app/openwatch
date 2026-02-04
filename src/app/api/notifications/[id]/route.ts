import { db } from '~server/db';
import { notifications } from '~server/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';

export const DELETE = async (
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const userId = session.user.id;

		const result = await db
			.delete(notifications)
			.where(and(eq(notifications.id, id), eq(notifications.recipientId, userId)))
			.returning();

		if (result.length === 0) {
			return NextResponse.json({ error: 'Notification not found or access denied' }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting notification:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
