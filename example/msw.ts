import { setupWorker } from 'msw/browser';
import { HttpResponse } from 'msw';
import { MswServer, withDelay } from '../src/FakeRest';
import { data } from './data';
import { dataProvider as defaultDataProvider } from './dataProvider';

const restServer = new MswServer({
    baseUrl: 'http://localhost:3000',
    data,
});

restServer.addMiddleware(withDelay(300));
restServer.addMiddleware(async (request, context, next) => {
    if (!request.headers?.get('Authorization')) {
        throw new Response(null, { status: 401 });
    }
    return next(request, context);
});

restServer.addMiddleware(async (request, context, next) => {
    if (context.collection === 'books' && request.method === 'POST') {
        if (
            restServer.collections[context.collection].getCount({
                filter: {
                    title: context.requestJson?.title,
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

export const worker = setupWorker(...restServer.getHandlers());

export const dataProvider = defaultDataProvider;
