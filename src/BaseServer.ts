import type { Collection } from './Collection.js';
import { Database, type DatabaseOptions } from './Database.js';
import type { Single } from './Single.js';
import type { CollectionItem, QueryFunction } from './types.js';

export class BaseServer<RequestType, ResponseType> {
    baseUrl = '';
    defaultQuery: QueryFunction = () => ({});
    middlewares: Array<Middleware<RequestType>> = [];
    database: Database;

    constructor({
        baseUrl = '',
        defaultQuery = () => ({}),
        database,
        ...options
    }: BaseServerOptions = {}) {
        this.baseUrl = baseUrl;
        this.defaultQuery = defaultQuery;

        if (database) {
            this.database = database;
        } else {
            this.database = new Database(options);
        }
    }

    /**
     * @param Function ResourceName => object
     */
    setDefaultQuery(query: QueryFunction) {
        this.defaultQuery = query;
    }

    getContext(context: NormalizedRequest): FakeRestContext {
        for (const name of this.database.getSingleNames()) {
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

    getNormalizedRequest(request: RequestType): Promise<NormalizedRequest> {
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
        for (const name of this.database.getSingleNames()) {
            const matches = ctx.url?.match(
                new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
            );
            if (!matches) continue;

            if (ctx.method === 'GET') {
                try {
                    return {
                        status: 200,
                        body: this.database.getOnly(name),
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
                    if (ctx.requestBody == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.database.updateOnly(name, ctx.requestBody),
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
                    if (ctx.requestBody == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.database.updateOnly(name, ctx.requestBody),
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
                if (!this.database.getCollection(name)) {
                    return { status: 404, headers: {} };
                }
                const count = this.database.getCount(
                    name,
                    params.filter ? { filter: params.filter } : {},
                );
                if (count > 0) {
                    const items = this.database.getAll(name, params);
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
                if (ctx.requestBody == null) {
                    return {
                        status: 400,
                        headers: {},
                    };
                }

                const newResource = this.database.addOne(name, ctx.requestBody);
                const newResourceURI = `${this.baseUrl}/${name}/${
                    newResource[
                        this.database.getCollection(name).identifierName
                    ]
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
            if (!this.database.getCollection(name)) {
                return { status: 404, headers: {} };
            }
            const id = Number.parseInt(matches[3]);
            if (ctx.method === 'GET') {
                try {
                    return {
                        status: 200,
                        body: this.database.getOne(name, id, params),
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
                    if (ctx.requestBody == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.database.updateOne(
                            name,
                            id,
                            ctx.requestBody,
                        ),
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
                    if (ctx.requestBody == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.database.updateOne(
                            name,
                            id,
                            ctx.requestBody,
                        ),
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
                        body: this.database.removeOne(name, id),
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

    addCollection<T extends CollectionItem = CollectionItem>(
        name: string,
        collection: Collection<T>,
    ) {
        this.database.addCollection(name, collection);
    }

    getCollection(name: string) {
        return this.database.getCollection(name);
    }

    getCollectionNames() {
        return this.database.getCollectionNames();
    }

    addSingle<T extends CollectionItem = CollectionItem>(
        name: string,
        single: Single<T>,
    ) {
        this.database.addSingle(name, single);
    }

    getSingle(name: string) {
        return this.database.getSingle(name);
    }

    getSingleNames() {
        return this.database.getSingleNames();
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
    database?: Database;
    baseUrl?: string;
    batchUrl?: string | null;
    defaultQuery?: QueryFunction;
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
    requestBody: Record<string, any> | undefined;
    params: { [key: string]: any };
};

export type NormalizedRequest = Pick<
    FakeRestContext,
    'url' | 'method' | 'params' | 'requestBody'
>;
