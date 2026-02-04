import { NextRequest, NextResponse } from 'next/server';
import { notifications } from '~server/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '~server/auth';
import { db } from '~server/db';

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;

		// Verify ownership and update
		const result = await db
			.update(notifications)
			.set({ read: true })
			.where(and(eq(notifications.id, id), eq(notifications.recipientId, userId)))
			.returning();

		if (result.length === 0) {
			return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error marking notification as read:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
