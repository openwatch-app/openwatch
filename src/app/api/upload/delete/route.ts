import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { auth } from '~server/auth';
import { db } from '~server/db';
import { user } from '~server/db/schema';
import { eq, or } from 'drizzle-orm';

export const POST = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { url } = await req.json();

		if (!url) {
			return NextResponse.json({ error: 'URL is required' }, { status: 400 });
		}

		// Parse URL to extract type and filename
		// Expected format: /api/images/[type]/[filename]
		const parts = url.split('/');
		// ["", "api", "images", "banners", "filename.jpg"]
		
		if (parts.length < 5 || parts[1] !== 'api' || parts[2] !== 'images') {
			return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
		}

		const type = parts[3];
		const filename = parts[4];

		if (!['avatars', 'banners'].includes(type)) {
			return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
		}

		// Security: Prevent directory traversal
		if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
			return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
		}

        // Verify ownership
        // Check if the file is associated with the user's profile
        const userRecord = await db.query.user.findFirst({
            where: eq(user.id, session.user.id)
        });

        if (!userRecord) {
             return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isOwner = (type === 'avatars' && userRecord.image?.includes(filename)) || 
                        (type === 'banners' && userRecord.banner?.includes(filename));

        if (!isOwner) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

		const filePath = join(process.cwd(), '.storage', type, filename);

		try {
			await unlink(filePath);
		} catch (err: any) {
			if (err.code === 'ENOENT') {
				// File doesn't exist, which is fine
				return NextResponse.json({ message: 'File already deleted or not found' });
			}
			throw err;
		}

		return NextResponse.json({ message: 'File deleted successfully' });
	} catch (error) {
		console.error('Error deleting image:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
