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
        throw new HttpResponse(null, { status: 401 });
    }

    if (
        context.collection === 'books' &&
        request.method === 'POST' &&
        !context.requestJson?.title
    ) {
        throw new HttpResponse(null, {
            status: 400,
            statusText: 'Title is required',
        });
    }

    return next(request, context);
});

export const worker = setupWorker(...restServer.getHandlers());

export const dataProvider = defaultDataProvider;
