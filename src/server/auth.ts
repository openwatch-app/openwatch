import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { count, eq } from 'drizzle-orm';
import { user } from './db/schema';
import { db } from './db';

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg' }),
	secret: process.env.AUTH_SECRET!,
	baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
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
				after: async (record) => {
					// Generate Handle
					let baseHandle = record.name || (record.email ? record.email.split('@')[0] : 'user');

					// Sanitize: remove @, lowercase, remove spaces
					baseHandle = baseHandle.replace(/@/g, '').toLowerCase().replace(/\s+/g, '');

					let handle = baseHandle;
					const MAX_HANDLE_RETRIES = 10;
					let retries = 0;
					let isUnique = false;

					while (!isUnique) {
						try {
							// Attempt to update directly, relying on the DB unique constraint
							await db.update(user).set({ handle }).where(eq(user.id, record.id));
							isUnique = true;
						} catch (error: any) {
							// Check for unique constraint violation (Postgres code 23505)
							if (error.code === '23505' || error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
								retries++;
								if (retries >= MAX_HANDLE_RETRIES) {
									console.error('Failed to generate unique handle after max retries');
									// We stop trying, the user will have a null handle or whatever was there (which might be null)
									// Or we could throw, but that might break the auth flow. 
									// Better to throw so the user knows something went wrong?
									// The instruction says "log/return an error so the request doesn't hang".
									throw new Error('Failed to generate unique handle');
								}
								// Append random number for next attempt
								const randomSuffix = Math.floor(Math.random() * 10000)
									.toString()
									.padStart(4, '0');
								handle = `${baseHandle}${randomSuffix}`;
							} else {
								// Rethrow other errors
								throw error;
							}
						}
					}
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
