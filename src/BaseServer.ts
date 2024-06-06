import { Database, type DatabaseOptions } from './Database.js';
import type { QueryFunction } from './types.js';

export class BaseServer<RequestType, ResponseType> extends Database {
    baseUrl = '';
    defaultQuery: QueryFunction = () => ({});
    middlewares: Array<Middleware<RequestType>> = [];

    constructor({
        baseUrl = '',
        defaultQuery = () => ({}),
        ...options
    }: BaseServerOptions = {}) {
        super(options);
        this.baseUrl = baseUrl;
        this.defaultQuery = defaultQuery;
    }

    /**
     * @param Function ResourceName => object
     */
    setDefaultQuery(query: QueryFunction) {
        this.defaultQuery = query;
    }

    getContext(
        context: Pick<
            FakeRestContext,
            'url' | 'method' | 'params' | 'requestJson'
        >,
    ): FakeRestContext {
        for (const name of this.getSingleNames()) {
            const matches = context.url?.match(
                new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
            );
            if (!matches) continue;
            return {
                ...context,
                single: name,
            };
        }

        const matches = context.url?.match(
            new RegExp(`^${this.baseUrl}\\/([^\\/?]+)(\\/(\\w))?(\\?.*)?$`),
        );
        if (matches) {
            const name = matches[1];
            const params = Object.assign(
                {},
                this.defaultQuery(name),
                context.params,
            );

            return {
                ...context,
                collection: name,
                params,
            };
        }

        return context;
    }

    getNormalizedRequest(
        request: RequestType,
    ): Promise<
        Pick<FakeRestContext, 'url' | 'method' | 'params' | 'requestJson'>
    > {
        throw new Error('Not implemented');
    }

    respond(
        response: BaseResponse | null,
        request: RequestType,
        context: FakeRestContext,
    ): Promise<ResponseType> {
        throw new Error('Not implemented');
    }

    async handle(request: RequestType): Promise<ResponseType | undefined> {
        const context = this.getContext(
            await this.getNormalizedRequest(request),
        );

        // Call middlewares
        let index = 0;
        const middlewares = [...this.middlewares];

        const next = (req: RequestType, ctx: FakeRestContext) => {
            const middleware = middlewares[index++];
            if (middleware) {
                return middleware(req, ctx, next);
            }

            return this.handleRequest(req, ctx);
        };

        try {
            const response = await next(request, context);
            if (response != null) {
                return this.respond(response, request, context);
            }
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }

            return error as ResponseType;
        }
    }

    handleRequest(request: RequestType, ctx: FakeRestContext): BaseResponse {
        // Handle Single Objects
        for (const name of this.getSingleNames()) {
            const matches = ctx.url?.match(
                new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
            );
            if (!matches) continue;

            if (ctx.method === 'GET') {
                try {
                    return {
                        status: 200,
                        body: this.getOnly(name),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                } catch (error) {
                    return {
                        status: 404,
                        headers: {},
                    };
                }
            }
            if (ctx.method === 'PUT') {
                try {
                    if (ctx.requestJson == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.updateOnly(name, ctx.requestJson),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                } catch (error) {
                    return {
                        status: 404,
                        headers: {},
                    };
                }
            }
            if (ctx.method === 'PATCH') {
                try {
                    if (ctx.requestJson == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.updateOnly(name, ctx.requestJson),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                } catch (error) {
                    return {
                        status: 404,
                        headers: {},
                    };
                }
            }
        }

        // handle collections
        const matches = ctx.url?.match(
            new RegExp(`^${this.baseUrl}\\/([^\\/?]+)(\\/(\\w))?(\\?.*)?$`),
        );
        if (!matches) {
            return { status: 404, headers: {} };
        }
        const name = matches[1];
        const params = Object.assign({}, this.defaultQuery(name), ctx.params);
        if (!matches[2]) {
            if (ctx.method === 'GET') {
                if (!this.getCollection(name)) {
                    return { status: 404, headers: {} };
                }
                const count = this.getCount(
                    name,
                    params.filter ? { filter: params.filter } : {},
                );
                if (count > 0) {
                    const items = this.getAll(name, params);
                    const first = params.range ? params.range[0] : 0;
                    const last =
                        params.range && params.range.length === 2
                            ? Math.min(
                                  items.length - 1 + first,
                                  params.range[1],
                              )
                            : items.length - 1;

                    return {
                        status: items.length === count ? 200 : 206,
                        body: items,
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Range': `items ${first}-${last}/${count}`,
                        },
                    };
                }

                return {
                    status: 200,
                    body: [],
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Range': 'items */0',
                    },
                };
            }
            if (ctx.method === 'POST') {
                if (ctx.requestJson == null) {
                    return {
                        status: 400,
                        headers: {},
                    };
                }

                const newResource = this.addOne(name, ctx.requestJson);
                const newResourceURI = `${this.baseUrl}/${name}/${
                    newResource[this.getCollection(name).identifierName]
                }`;

                return {
                    status: 201,
                    body: newResource,
                    headers: {
                        'Content-Type': 'application/json',
                        Location: newResourceURI,
                    },
                };
            }
        } else {
            if (!this.getCollection(name)) {
                return { status: 404, headers: {} };
            }
            const id = Number.parseInt(matches[3]);
            if (ctx.method === 'GET') {
                try {
                    return {
                        status: 200,
                        body: this.getOne(name, id, params),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                } catch (error) {
                    return {
                        status: 404,
                        headers: {},
                    };
                }
            }
            if (ctx.method === 'PUT') {
                try {
                    if (ctx.requestJson == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.updateOne(name, id, ctx.requestJson),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                } catch (error) {
                    return {
                        status: 404,
                        headers: {},
                    };
                }
            }
            if (ctx.method === 'PATCH') {
                try {
                    if (ctx.requestJson == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.updateOne(name, id, ctx.requestJson),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                } catch (error) {
                    return {
                        status: 404,
                        headers: {},
                    };
                }
            }
            if (ctx.method === 'DELETE') {
                try {
                    return {
                        status: 200,
                        body: this.removeOne(name, id),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                } catch (error) {
                    return {
                        status: 404,
                        headers: {},
                    };
                }
            }
        }
        return {
            status: 404,
            headers: {},
        };
    }

    addMiddleware(middleware: Middleware<RequestType>) {
        this.middlewares.push(middleware);
    }
}

export type Middleware<RequestType> = (
    request: RequestType,
    context: FakeRestContext,
    next: (
        req: RequestType,
        ctx: FakeRestContext,
    ) => Promise<BaseResponse | null> | BaseResponse | null,
) => Promise<BaseResponse | null> | BaseResponse | null;

export type BaseServerOptions = DatabaseOptions & {
    baseUrl?: string;
    batchUrl?: string | null;
    defaultQuery?: QueryFunction;
};

export type BaseRequest = {
    url?: string;
    method?: string;
    collection?: string;
    single?: string;
    requestJson?: Record<string, any> | undefined;
    params?: { [key: string]: any };
};

export type BaseResponse = {
    status: number;
    body?: Record<string, any> | Record<string, any>[];
    headers: { [key: string]: string };
};

export type FakeRestContext = {
    url?: string;
    method?: string;
    collection?: string;
    single?: string;
    requestJson: Record<string, any> | undefined;
    params: { [key: string]: any };
};
