import type { Middleware } from './BaseServer.js';

export const withDelay =
    (delayMs: number): Middleware =>
    (context, next) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(next(context));
            }, delayMs);
        });
    };
