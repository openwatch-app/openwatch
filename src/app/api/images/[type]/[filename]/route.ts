import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ type: string; filename: string }> }) => {
	const { type, filename } = await params;

	if (!['avatars', 'banners'].includes(type)) {
		return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
	}

	// Construct file path
	const baseDir = join(process.cwd(), '.storage', type);
	const filePath = join(baseDir, filename);

	// Security: Prevent directory traversal
	const resolvedPath = await import('path').then((p) => p.resolve(filePath));
	if (!resolvedPath.startsWith(baseDir) || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
		return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
	}

	if (!existsSync(filePath)) {
		return NextResponse.json({ error: 'File not found' }, { status: 404 });
	}

	try {
		const fileStat = await stat(filePath);
		const fileSize = fileStat.size;
		const file = await readFile(filePath);

		// Determine content type based on extension
		const ext = filename.split('.').pop()?.toLowerCase();
		let contentType = 'application/octet-stream';
		if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
		else if (ext === 'png') contentType = 'image/png';
		else if (ext === 'gif') contentType = 'image/gif';
		else if (ext === 'webp') contentType = 'image/webp';
		else if (ext === 'svg') contentType = 'image/svg+xml';

		const headers = new Headers();
		headers.set('Content-Type', contentType);
		headers.set('Content-Length', fileSize.toString());
		headers.set('Cache-Control', 'public, max-age=31536000, immutable');
		if (contentType === 'image/svg+xml') {
			headers.set('Content-Security-Policy', "default-src 'none'; script-src 'none'; sandbox");
		}

		return new NextResponse(file as any, {
			headers
		});
	} catch (error) {
		console.error('Error serving file:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
