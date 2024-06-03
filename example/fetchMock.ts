import fetchMock from 'fetch-mock';
import FakeRest from 'fakerest';
import { data } from './data';

export const initializeFetchMock = () => {
    const restServer = new FakeRest.FetchServer({
        baseUrl: 'http://localhost:3000',
        data,
        loggingEnabled: true,
    });
    if (window) {
        // @ts-ignore
        window.restServer = restServer; // give way to update data in the console
    }
    restServer.addMiddleware(async (request, context, next) => {
        if (!request.headers?.get('Authorization')) {
            return new Response(null, { status: 401 });
        }

        if (
            context.collection === 'books' &&
            request.method === 'POST' &&
            !context.requestJson?.title
        ) {
            return new Response(null, {
                status: 400,
                statusText: 'Title is required',
            });
        }

        return next(request, context);
    });
    fetchMock.mock('begin:http://localhost:3000', restServer.getHandler());
};
