import type { Collection } from './Collection.ts';
import { Database, type DatabaseOptions } from './Database.ts';
import type { Single } from './Single.ts';
import type {
    APIServer,
    BaseResponse,
    FakeRestContext,
    CollectionItem,
    QueryFunction,
    NormalizedRequest,
} from './types.ts';

export class SimpleRestServer implements APIServer {
    baseUrl = '';
    defaultQuery: QueryFunction = () => ({});
    middlewares: Array<Middleware>;
    database: Database;

    constructor({
        baseUrl = '',
        defaultQuery = () => ({}),
        database,
        middlewares,
        ...options
    }: BaseServerOptions = {}) {
        this.baseUrl = baseUrl;
        this.defaultQuery = defaultQuery;
        this.middlewares = middlewares || [];

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

    getContext(normalizedRequest: NormalizedRequest): FakeRestContext {
        for (const name of this.database.getSingleNames()) {
            const matches = normalizedRequest.url?.match(
                new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
            );
            if (!matches) continue;
            return {
                ...normalizedRequest,
                single: name,
            };
        }

        const matches = normalizedRequest.url?.match(
            new RegExp(
                `^${this.baseUrl}\\/([^\\/?]+)(\\/(\\w+|\\d+))?(\\?.*)?$`,
            ),
        );
        if (matches) {
            const name = matches[1];
            const params = Object.assign(
                {},
                this.defaultQuery(name),
                normalizedRequest.params,
            );

            return {
                ...normalizedRequest,
                collection: name,
                params,
            };
        }

        return normalizedRequest;
    }

    async handle(normalizedRequest: NormalizedRequest): Promise<BaseResponse> {
        const context = this.getContext(normalizedRequest);
        // Call middlewares
        let index = 0;
        const middlewares = [...this.middlewares];

        const next = (context: FakeRestContext) => {
            const middleware = middlewares[index++];
            if (middleware) {
                return middleware(context, next);
            }
            return this.handleRequest(context);
        };

        try {
            const response = await next(context);
            return response;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }

            return error as BaseResponse;
        }
    }

    handleRequest(context: FakeRestContext): BaseResponse {
        // Handle Single Objects
        for (const name of this.database.getSingleNames()) {
            const matches = context.url?.match(
                new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
            );
            if (!matches) continue;

            if (context.method === 'GET') {
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
            if (context.method === 'PUT') {
                try {
                    if (context.requestBody == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.database.updateOnly(
                            name,
                            context.requestBody,
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
            if (context.method === 'PATCH') {
                try {
                    if (context.requestBody == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.database.updateOnly(
                            name,
                            context.requestBody,
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
        }

        // handle collections
        const matches = context.url?.match(
            new RegExp(
                `^${this.baseUrl}\\/([^\\/?]+)(\\/(\\w+|\\d+))?(\\?.*)?$`,
            ),
        );
        if (!matches) {
            return { status: 404, headers: {} };
        }
        const name = matches[1];
        const params = Object.assign(
            {},
            this.defaultQuery(name),
            context.params,
        );
        if (!matches[2]) {
            if (context.method === 'GET') {
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
            if (context.method === 'POST') {
                if (context.requestBody == null) {
                    return {
                        status: 400,
                        headers: {},
                    };
                }

                const newResource = this.database.addOne(
                    name,
                    context.requestBody,
                );
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
            const id = matches[3];
            if (context.method === 'GET') {
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
            if (context.method === 'PUT') {
                try {
                    if (context.requestBody == null) {
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
                            context.requestBody,
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
            if (context.method === 'PATCH') {
                try {
                    if (context.requestBody == null) {
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
                            context.requestBody,
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
            if (context.method === 'DELETE') {
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

    addMiddleware(middleware: Middleware) {
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

export type Middleware = (
    context: FakeRestContext,
    next: (context: FakeRestContext) => Promise<BaseResponse> | BaseResponse,
) => Promise<BaseResponse> | BaseResponse;

export type BaseServerOptions = DatabaseOptions & {
    database?: Database;
    baseUrl?: string;
    batchUrl?: string | null;
    defaultQuery?: QueryFunction;
    middlewares?: Array<Middleware>;
};
