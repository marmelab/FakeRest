import { setupWorker } from 'msw/browser';
import { MswServer } from '../src/FakeRest';
import { data } from './data';
import { HttpResponse } from 'msw';

const restServer = new MswServer({
    baseUrl: 'http://localhost:3000',
    data,
});

restServer.addMiddleware(async (request, context, next) => {
    if (!request.headers?.get('Authorization')) {
        return new HttpResponse(null, { status: 401 });
    }

    if (
        context.collection === 'books' &&
        request.method === 'POST' &&
        !context.requestJson?.title
    ) {
        return new HttpResponse(null, {
            status: 400,
            statusText: 'Title is required',
        });
    }

    return next(request, context);
});

export const worker = setupWorker(...restServer.getHandlers());
