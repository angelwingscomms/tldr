// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Env {
		DB: D1Database;
		R2: R2Bucket;
		SECRET: string | { get?: () => Promise<string> };
		GOOGLE_ID: string | { get?: () => Promise<string> };
		GOOGLE_SECRET: string | { get?: () => Promise<string> };
		MASTER_KEY: string | { get?: () => Promise<string> };
	}

	namespace App {
		interface Locals {
			db: D1Database;
			device_id: string;
			user: import('$lib/server/session').SessionUser | null;
		}

		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
