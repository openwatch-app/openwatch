import { NextRequest, NextResponse } from 'next/server';
import { db } from '~server/db';
import { comments } from '~server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '~server/auth';
import { generateId } from 'better-auth';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const { searchParams } = new URL(req.url);
		const sort = searchParams.get('sort') || 'top';
		const session = await auth.api.getSession({
			headers: req.headers
		});
		const currentUserId = session?.user?.id;

		const allComments = await db.query.comments.findMany({
			where: eq(comments.videoId, id),
			with: {
				user: true,
				reactions: true
			},
			orderBy: [desc(comments.isPinned), desc(comments.createdAt)]
		});

		// Map to interface and build tree
		const commentMap = new Map();
		const roots: any[] = [];

		// First pass: create objects
		allComments.forEach((c) => {
			const likes = c.reactions.filter((r) => r.type === 'LIKE').length;
			const dislikes = c.reactions.filter((r) => r.type === 'DISLIKE').length;
			const userReaction = currentUserId ? c.reactions.find((r) => r.userId === currentUserId)?.type : null;

			const commentObj = {
				id: c.id,
				user: {
					id: c.user.id,
					name: c.user.name,
					avatar: c.user.image || '',
					handle: c.user.handle || c.user.name
				},
				content: c.content,
				likes,
				dislikes,
				userReaction,
				timestamp: c.createdAt.toISOString(),
				createdAt: c.createdAt.toISOString(),
				isPinned: c.isPinned,
				isHearted: c.isHearted,
				parentId: c.parentId,
				replies: []
			};
			commentMap.set(c.id, commentObj);
		});

		// Second pass: build tree
		commentMap.forEach((c) => {
			if (c.parentId && commentMap.has(c.parentId)) {
				commentMap.get(c.parentId).replies.push(c);
			} else {
				roots.push(c);
			}
		});

		// Sort roots based on the sort parameter
		roots.sort((a, b) => {
			// Always keep pinned comments at the top
			if (a.isPinned && !b.isPinned) return -1;
			if (!a.isPinned && b.isPinned) return 1;

			if (sort === 'newest') {
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			} else {
				// Top comments: sort by likes
				const diff = b.likes - a.likes;
				if (diff !== 0) return diff;
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			}
		});

		return NextResponse.json(roots);
	} catch (error) {
		console.error('Error fetching comments:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { content, parentId } = await req.json();

		if (!content || !content.trim()) {
			return NextResponse.json({ error: 'Content is required' }, { status: 400 });
		}

		if (parentId) {
			const parent = await db.query.comments.findFirst({
				where: and(eq(comments.id, parentId), eq(comments.videoId, id))
			});
			if (!parent) {
				return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
			}
		}

		const newComment = await db
			.insert(comments)
			.values({
				id: generateId(),
				videoId: id,
				userId: session.user.id,
				content,
				parentId: parentId || null
			})
			.returning();

		// Fetch user info to return complete object
		const commentWithUser = await db.query.comments.findFirst({
			where: eq(comments.id, newComment[0].id),
			with: {
				user: true
			}
		});

		if (!commentWithUser) {
			return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
		}

		const formattedComment = {
			id: commentWithUser.id,
			user: {
				id: commentWithUser.user.id,
				name: commentWithUser.user.name,
				avatar: commentWithUser.user.image || '',
				handle: commentWithUser.user.handle || ''
			},
			content: commentWithUser.content,
			likes: 0,
			dislikes: 0,
			userReaction: null,
			timestamp: commentWithUser.createdAt.toISOString(),
			createdAt: commentWithUser.createdAt.toISOString(),
			isPinned: false,
			isHearted: false,
			parentId: commentWithUser.parentId,
			replies: []
		};

		return NextResponse.json(formattedComment);
	} catch (error) {
		console.error('Error creating comment:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
