import { SetMetadata } from '@nestjs/common';

export const USE_LOCK_KEY = 'use_lock';

export interface LockMetadata {
  key: string;
  ttl?: number;
}

export const UseLock = (key: string, ttl?: number) =>
  SetMetadata<typeof USE_LOCK_KEY, LockMetadata>(USE_LOCK_KEY, { key, ttl });
