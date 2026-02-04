import { NextRequest, NextResponse } from 'next/server';
import { db } from '~server/db';
import { user } from '~server/db/schema';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { auth } from '~server/auth';

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
        const userRole = (session?.user as any)?.role;

		if (!session || userRole !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}
        
        const search = req.nextUrl.searchParams.get('search') || '';

        const users = await db.query.user.findMany({
            where: search ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`)) : undefined,
            orderBy: [desc(user.createdAt)],
            limit: 50
        });

		return NextResponse.json(users);
	} catch (error) {
		console.error('Error fetching users:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const PATCH = async (req: NextRequest) => {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        const userRole = (session?.user as any)?.role;

        if (!session || userRole !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { userId, action, value } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const updateData: any = {};
        if (action === 'ban') {
             if (typeof value !== 'boolean') return NextResponse.json({ error: 'Invalid value for ban' }, { status: 400 });
             updateData.banned = value;
        } else if (action === 'upload') {
             if (typeof value !== 'boolean') return NextResponse.json({ error: 'Invalid value for upload' }, { status: 400 });
             updateData.allowedToUpload = value;
        } else if (action === 'role') {
             if (value !== 'admin' && value !== 'user') return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
             updateData.role = value;
        } else {
             return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await db.update(user).set(updateData).where(eq(user.id, userId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
