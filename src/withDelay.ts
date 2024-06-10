import type { Middleware } from './SimpleRestServer.ts';

export const withDelay =
    (delayMs: number): Middleware =>
    (context, next) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(next(context));
            }, delayMs);
        });
    };
