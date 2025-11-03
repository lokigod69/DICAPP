import { env } from '$env/dynamic/public';

export const COMMIT = env.PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
export const BRANCH = env.PUBLIC_VERCEL_GIT_COMMIT_REF ?? 'dev';
export const BUILD = env.PUBLIC_VERCEL_ENV ?? 'local';
