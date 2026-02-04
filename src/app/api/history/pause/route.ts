import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { db } from '~server/db';
import { user } from '~server/db/schema';
import { eq } from 'drizzle-orm';

export const POST = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await req.json();
		const { paused } = body;

        if (typeof paused !== 'boolean') {
            return NextResponse.json({ error: 'Invalid value for paused' }, { status: 400 });
        }

		await db.update(user).set({ isHistoryPaused: paused }).where(eq(user.id, session.user.id));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error updating history pause status:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userData = await db.query.user.findFirst({
			where: eq(user.id, session.user.id),
			columns: { isHistoryPaused: true }
		});

		return NextResponse.json({ isHistoryPaused: userData?.isHistoryPaused || false });
	} catch (error) {
		console.error('Error fetching history pause status:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
