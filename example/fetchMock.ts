import fetchMock from 'fetch-mock';
import { FetchMockServer, withDelay } from '../src';
import { data } from './data';
import { dataProvider as defaultDataProvider } from './dataProvider';

export const initializeFetchMock = () => {
    const restServer = new FetchMockServer({
        baseUrl: 'http://localhost:3000',
        data,
        loggingEnabled: true,
        middlewares: [
            withDelay(300),
            async (context, next) => {
                if (!context.headers?.get('Authorization')) {
                    return {
                        status: 401,
                        headers: {},
                    };
                }
                return next(context);
            },
            async (context, next) => {
                if (
                    context.collection === 'books' &&
                    context.method === 'POST'
                ) {
                    if (
                        data[context.collection].some(
                            (book) => book.title === context.requestBody?.title,
                        )
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

                return next(context);
            },
        ],
    });
    if (window) {
        // @ts-ignore
        window.restServer = restServer; // give way to update data in the console
    }

    fetchMock.mock('begin:http://localhost:3000', restServer.getHandler());
};

export const dataProvider = defaultDataProvider;
