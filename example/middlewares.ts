import { withDelay } from '../src';
import { data } from './data';

export const middlewares = [
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
        if (context.collection === 'books' && context.method === 'POST') {
            if (
                data[context.collection].some(
                    (book) => book.title === context.requestBody?.title,
                )
            ) {
                return {
                    body: {
                        errors: {
                            title: 'An article with this title already exists. The title must be unique.',
                        },
                    },
                    status: 400,
                    headers: {},
                };
            }
        }
        return next(context);
    },
];
