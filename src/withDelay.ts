import type { Middleware } from './BaseServerWithMiddlewares.js';

export const withDelay =
    <RequestType>(delayMs: number): Middleware<RequestType> =>
    (request, context, next) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(next(request, context));
            }, delayMs);
        });
    };
