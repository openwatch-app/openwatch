import { pgTable, text, timestamp, boolean, index, integer, jsonb, foreignKey, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	handle: text('handle').unique(),
	role: text('role').default('user').notNull(),
	banned: boolean('banned').default(false).notNull(),
	allowedToUpload: boolean('allowed_to_upload').default(true).notNull(),
	banner: text('banner'),
	description: text('description'),
	isHistoryPaused: boolean('is_history_paused').default(false).notNull(),
	verified: boolean('verified').default(false).notNull(),
	lastActiveAt: timestamp('last_active_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const systemSettings = pgTable('system_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const subscription = pgTable(
	'subscription',
	{
		id: text('id').primaryKey(),
		subscriberId: text('subscriber_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		subscribedToId: text('subscribed_to_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('subscription_subscriberId_idx').on(table.subscriberId),
		index('subscription_subscribedToId_idx').on(table.subscribedToId),
		unique('subscription_subscriber_subscribedTo_unique').on(table.subscriberId, table.subscribedToId)
	]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	subscriptions: many(subscription, { relationName: 'subscriber' }),
	subscribers: many(subscription, { relationName: 'subscribedTo' })
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
	subscriber: one(user, {
		fields: [subscription.subscriberId],
		references: [user.id],
		relationName: 'subscriber'
	}),
	subscribedTo: one(user, {
		fields: [subscription.subscribedToId],
		references: [user.id],
		relationName: 'subscribedTo'
	})
}));

export const sessionRelations = relations(session, ({ one }) => ({ user: one(user, { fields: [session.userId], references: [user.id] }) }));

export const accountRelations = relations(account, ({ one }) => ({ user: one(user, { fields: [account.userId], references: [user.id] }) }));

export const videos = pgTable('videos', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	originalPath: text('original_path').notNull(),
	title: text('title'),
	description: text('description'),
	duration: integer('duration'),
	thumbnailUrl: text('thumbnail_url'),
	uploadDate: timestamp('upload_date').defaultNow().notNull(),
	status: text('status').default('processing').notNull(),
	visibility: text('visibility').default('private').notNull(),
	restrictions: text('restrictions').default('None').notNull(),
	views: integer('views').default(0).notNull(),
	likes: integer('likes').default(0).notNull(),
	dislikes: integer('dislikes').default(0).notNull(),
	category: text('category').default('General').notNull(),
	tags: text('tags').array(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const videoQualities = pgTable(
	'video_qualities',
	{
		id: text('id').primaryKey(),
		videoId: text('video_id')
			.notNull()
			.references(() => videos.id, { onDelete: 'cascade' }),
		quality: text('quality').notNull(),
		resolution: text('resolution').notNull(),
		playlistPath: text('playlist_path').notNull(),
		bitrate: integer('bitrate'),
		isReady: boolean('is_ready').default(false).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('video_qualities_video_id_idx').on(table.videoId), index('video_qualities_quality_idx').on(table.quality)]
);

export const videoViews = pgTable(
	'video_views',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
		videoId: text('video_id')
			.notNull()
			.references(() => videos.id, { onDelete: 'cascade' }),
		ipAddress: text('ip_address'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('video_views_video_id_idx').on(table.videoId), index('video_views_user_id_idx').on(table.userId)]
);

export const videoViewsRelations = relations(videoViews, ({ one }) => ({
	user: one(user, {
		fields: [videoViews.userId],
		references: [user.id]
	}),
	video: one(videos, {
		fields: [videoViews.videoId],
		references: [videos.id]
	})
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
	user: one(user, {
		fields: [videos.userId],
		references: [user.id]
	}),
	qualities: many(videoQualities),
	reactions: many(videoReactions),
	views: many(videoViews)
}));

export const videoQualitiesRelations = relations(videoQualities, ({ one }) => ({
	video: one(videos, {
		fields: [videoQualities.videoId],
		references: [videos.id]
	})
}));
export const videoReactions = pgTable(
	'video_reactions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		videoId: text('video_id')
			.notNull()
			.references(() => videos.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['LIKE', 'DISLIKE'] }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('video_reactions_video_id_idx').on(table.videoId), index('video_reactions_user_id_idx').on(table.userId), unique('video_reactions_unique').on(table.userId, table.videoId)]
);

export const videoReactionsRelations = relations(videoReactions, ({ one }) => ({
	user: one(user, {
		fields: [videoReactions.userId],
		references: [user.id]
	}),
	video: one(videos, {
		fields: [videoReactions.videoId],
		references: [videos.id]
	})
}));

export const comments = pgTable(
	'comments',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		videoId: text('video_id')
			.notNull()
			.references(() => videos.id, { onDelete: 'cascade' }),
		content: text('content').notNull(),
		parentId: text('parent_id'),
		isPinned: boolean('is_pinned').default(false).notNull(),
		isHearted: boolean('is_hearted').default(false).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		index('comments_video_id_idx').on(table.videoId),
		index('comments_user_id_idx').on(table.userId),
		index('comments_parent_id_idx').on(table.parentId),
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: 'comments_parent_id_fk'
		}).onDelete('cascade')
	]
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
	user: one(user, {
		fields: [comments.userId],
		references: [user.id]
	}),
	video: one(videos, {
		fields: [comments.videoId],
		references: [videos.id]
	}),
	parent: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: 'replies'
	}),
	replies: many(comments, {
		relationName: 'replies'
	}),
	reactions: many(commentReactions)
}));
export const commentReactions = pgTable(
	'comment_reactions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		commentId: text('comment_id')
			.notNull()
			.references(() => comments.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['LIKE', 'DISLIKE'] }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('comment_reactions_comment_id_idx').on(table.commentId),
		index('comment_reactions_user_id_idx').on(table.userId),
		unique('comment_reactions_unique').on(table.userId, table.commentId)
	]
);

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
	user: one(user, {
		fields: [commentReactions.userId],
		references: [user.id]
	}),
	comment: one(comments, {
		fields: [commentReactions.commentId],
		references: [comments.id]
	})
}));
