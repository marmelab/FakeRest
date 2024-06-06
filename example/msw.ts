import { setupWorker } from 'msw/browser';
import { MswServer, withDelay } from '../src';
import { data } from './data';
import { dataProvider as defaultDataProvider } from './dataProvider';

export const initializeMsw = async () => {
    const restServer = new MswServer({
        baseUrl: 'http://localhost:3000',
        data,
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
    const worker = setupWorker(restServer.getHandler());
    return worker.start({
        quiet: true, // Instruct MSW to not log requests in the console
        onUnhandledRequest: 'bypass', // Instruct MSW to ignore requests we don't handle
    });
};

export const dataProvider = defaultDataProvider;
