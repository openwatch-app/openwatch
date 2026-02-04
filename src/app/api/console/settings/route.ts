import { NextRequest, NextResponse } from 'next/server';
import { db } from '~server/db';
import { systemSettings } from '~server/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '~server/auth';

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
        const userRole = (session?.user as any)?.role;

		if (!session || userRole !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

        const settings = await db.select().from(systemSettings);
        const settingsMap = settings.reduce((acc: any, curr) => ({ ...acc, [curr.key]: curr.value }), {});

		return NextResponse.json(settingsMap);
	} catch (error) {
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const POST = async (req: NextRequest) => {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        const userRole = (session?.user as any)?.role;

        if (!session || userRole !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { key, value } = await req.json();
        
        // Input validation
        if (!key || typeof key !== 'string' || key.trim() === '') {
            return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
        }

        // Upsert
        await db.insert(systemSettings)
            .values({ key, value: String(value) })
            .onConflictDoUpdate({ target: systemSettings.key, set: { value: String(value) } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
