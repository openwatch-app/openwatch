import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { count, eq } from 'drizzle-orm';
import { user } from './db/schema';
import { db } from './db';

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	user: {
		additionalFields: {
			handle: { type: 'string' },
			role: { type: 'string', required: false, defaultValue: 'user' },
			banned: { type: 'boolean', required: false, defaultValue: false },
			allowedToUpload: { type: 'boolean', required: false, defaultValue: true },
			lastActiveAt: { type: 'date', required: false }
		}
	},
	databaseHooks: {
		user: {
			create: {
				before: async (record) => {
					const userCountResult = await db.select({ value: count() }).from(user);
					const userCount = userCountResult[0]?.value || 0;
					if (userCount === 0) {
						return {
							...record,
							role: 'admin'
						} as any;
					}
					return record;
				}
			}
		},
		session: {
			create: {
				after: async (session) => {
					await db.update(user).set({ lastActiveAt: new Date() }).where(eq(user.id, session.userId));
				}
			}
		}
	}
});
