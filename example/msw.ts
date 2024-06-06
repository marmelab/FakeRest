import { setupWorker } from 'msw/browser';
import { MswServer, withDelay } from '../src';
import { data } from './data';
import { dataProvider as defaultDataProvider } from './dataProvider';

const restServer = new MswServer({
    baseUrl: 'http://localhost:3000',
    data,
});

restServer.addMiddleware(withDelay(300));
restServer.addMiddleware(async (request, context, next) => {
    if (!request.headers?.get('Authorization')) {
        return {
            status: 401,
            headers: {},
        };
    }
    return next(request, context);
});

restServer.addMiddleware(async (request, context, next) => {
    if (context.collection === 'books' && request.method === 'POST') {
        if (
            restServer.collections[context.collection].getCount({
                filter: {
                    title: context.requestBody?.title,
                },
            }) > 0
        ) {
            throw new Response(
                JSON.stringify({
                    errors: {
                        title: 'An article with this title already exists. The title must be unique.',
                    },
                }),
                {
                    status: 400,
                    statusText: 'Title is required',
                },
            );
        }
    }

    return next(request, context);
});

export const initializeMsw = async () => {
    const worker = setupWorker(restServer.getHandler());
    return worker.start({
        quiet: true, // Instruct MSW to not log requests in the console
        onUnhandledRequest: 'bypass', // Instruct MSW to ignore requests we don't handle
    });
};

export const dataProvider = defaultDataProvider;
