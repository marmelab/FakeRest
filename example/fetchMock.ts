import fetchMock from 'fetch-mock';
import { FetchMockServer, withDelay } from '../src';
import { data } from './data';
import { dataProvider as defaultDataProvider } from './dataProvider';

export const initializeFetchMock = () => {
    const restServer = new FetchMockServer({
        baseUrl: 'http://localhost:3000',
        data,
        loggingEnabled: true,
    });
    if (window) {
        // @ts-ignore
        window.restServer = restServer; // give way to update data in the console
    }

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
    fetchMock.mock('begin:http://localhost:3000', restServer.getHandler());
};

export const dataProvider = defaultDataProvider;
