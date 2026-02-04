import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { auth } from '~server/auth';
import { join } from 'path';

export const POST = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const formData = await req.formData();
		const file = formData.get('file') as File;
		const type = (formData.get('type') as string) || 'avatars'; // Default to avatars if not specified

		if (!file) {
			return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
		}

		if (!file.type.startsWith('image/')) {
			return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
		}

		if (!['avatars', 'banners'].includes(type)) {
			return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Magic number validation
		const hex = buffer.toString('hex', 0, 4).toUpperCase();
		let valid = false;
		let detectedType = '';

		// JPG (FF D8 FF)
		if (hex.startsWith('FFD8FF')) {
			valid = true;
			detectedType = 'image/jpeg';
		}
		// PNG (89 50 4E 47)
		else if (hex.startsWith('89504E47')) {
			valid = true;
			detectedType = 'image/png';
		}
		// GIF (47 49 46 38)
		else if (hex.startsWith('47494638')) {
			valid = true;
			detectedType = 'image/gif';
		}
		// WEBP (RIFF....WEBP)
		else if (hex.startsWith('52494646') && buffer.toString('hex', 8, 12).toUpperCase() === '57454250') {
			valid = true;
			detectedType = 'image/webp';
		}

		if (!valid) {
			return NextResponse.json({ error: 'Invalid file content' }, { status: 400 });
		}

		// Validate extension matches detected type
		const ext = file.name.split('.').pop()?.toLowerCase() || '';
		const allowedExtensions: Record<string, string[]> = {
			'image/jpeg': ['jpg', 'jpeg'],
			'image/png': ['png'],
			'image/gif': ['gif'],
			'image/webp': ['webp']
		};

		if (!allowedExtensions[detectedType]?.includes(ext)) {
			return NextResponse.json({ error: 'File extension does not match file content' }, { status: 400 });
		}

		// Ensure upload directory exists
		const uploadDir = join(process.cwd(), '.storage', type);
		try {
			await mkdir(uploadDir, { recursive: true });
		} catch (err) {
			// Ignore if directory already exists
		}

		// Create a unique filename
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const extension = file.name.split('.').pop() || 'jpg';
		const filename = `${uniqueSuffix}.${extension}`;
		const path = join(uploadDir, filename);

		await writeFile(path, buffer);

		return NextResponse.json({
			url: `/api/images/${type}/${filename}`,
			message: 'Upload successful'
		});
	} catch (error) {
		console.error('Error uploading image:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
