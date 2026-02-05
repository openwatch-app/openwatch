import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ videoId: string; path: string[] }> }) => {
	const { videoId, path: pathParts } = await params;

	if (pathParts.some((p) => p.includes('..') || p.includes('/') || p.includes('\\'))) {
		return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
	}

	// Construct file path
	const filePath = join(process.cwd(), '.storage', 'streams', videoId, ...pathParts);

	if (!existsSync(filePath)) {
		return NextResponse.json({ error: 'File not found' }, { status: 404 });
	}

	try {
		const file = await readFile(filePath);
		const stats = await import('fs/promises').then((fs) => fs.stat(filePath));

		// Determine content type
		const rawFilename = pathParts[pathParts.length - 1];
		const filename = rawFilename.trim().toLowerCase();
		let contentType = 'application/octet-stream';

		if (filename.endsWith('.m3u8')) {
			contentType = 'application/x-mpegURL'; // Try alternative standard MIME type
			// Read as buffer first
			let textContent = file.toString('utf-8');

			// Strip BOM if present
			if (textContent.charCodeAt(0) === 0xfeff) {
				textContent = textContent.slice(1);
			}

			// Normalize line endings and trim whitespace
			textContent = textContent.replace(/\r\n/g, '\n').trim();

			return new NextResponse(textContent, {
				headers: {
					'Content-Type': contentType,
					'Access-Control-Allow-Origin': '*',
					'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
					Pragma: 'no-cache',
					Expires: '0'
				}
			});
		} else if (filename.endsWith('.ts')) {
			contentType = 'video/mp2t';
		} else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
			contentType = 'image/jpeg';
		}

		return new NextResponse(file, {
			headers: {
				'Content-Type': contentType,
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'public, max-age=31536000, immutable',
				Pragma: 'cache',
				Expires: new Date(Date.now() + 31536000000).toUTCString()
			}
		});
	} catch (error) {
		console.error('Error serving file:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const OPTIONS = async () => {
	return new NextResponse(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Range'
		}
	});
};
