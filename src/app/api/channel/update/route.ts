import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { user } from '~server/db/schema';
import { auth } from '~server/auth';
import { db } from '~server/db';

export const PATCH = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await req.json();
		const { name, handle, description, image, banner } = body;

		const userId = session.user.id;

		// 1. Basic validation
		if (handle) {
			// Handle should be alphanumeric, underscores, or dots, and 3-30 chars
			const handleRegex = /^[a-zA-Z0-9._]{3,30}$/;
			if (!handleRegex.test(handle)) {
				return NextResponse.json({ error: 'Invalid handle format' }, { status: 400 });
			}

			// 2. Check handle uniqueness (excluding current user)
			const existingUser = await db.query.user.findFirst({
				where: and(eq(user.handle, handle), ne(user.id, userId))
			});

			if (existingUser) {
				return NextResponse.json({ error: 'Handle is already taken' }, { status: 400 });
			}
		}

		// 3. Update user record (restricted to session user id)
		await db
			.update(user)
			.set({
				...(name && { name: name.trim() }),
				...(handle && { handle }),
				...(description !== undefined && { description: description.trim() }),
				...(image !== undefined && { image }),
				...(banner !== undefined && { banner }),
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));

		return NextResponse.json({ message: 'Channel updated successfully' });
	} catch (error) {
		console.error('Error updating channel:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
