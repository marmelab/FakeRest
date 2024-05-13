import { Collection } from './Collection.js';
import { Single } from './Single.js';
import type { CollectionItem, Query, QueryFunction } from './types.js';

export class BaseServer {
    baseUrl: string | null = null;
    loggingEnabled = false;
    defaultQuery: QueryFunction = () => ({});
    batchUrl: string | null = null;
    collections: Record<string, Collection<any>> = {};
    singles: Record<string, Single<any>> = {};

    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Shortcut for adding several collections if identifierName is always 'id'
     */
    init(data: Record<string, CollectionItem[] | CollectionItem>) {
        for (const name in data) {
            const value = data[name];
            if (Array.isArray(value)) {
                this.addCollection(name, new Collection(value, 'id'));
            } else {
                this.addSingle(name, new Single(value));
            }
        }
    }

    toggleLogging() {
        this.loggingEnabled = !this.loggingEnabled;
    }

    /**
     * @param Function ResourceName => object
     */
    setDefaultQuery(query: QueryFunction) {
        this.defaultQuery = query;
    }

    setBatchUrl(batchUrl: string) {
        this.batchUrl = batchUrl;
    }

    /**
     * @deprecated use setBatchUrl instead
     */
    setBatch(url: string) {
        console.warn(
            'Server.setBatch() is deprecated, use Server.setBatchUrl() instead',
        );
        this.batchUrl = url;
    }

    addCollection<T extends CollectionItem = CollectionItem>(
        name: string,
        collection: Collection<T>,
    ) {
        this.collections[name] = collection;
        collection.setServer(this);
        collection.setName(name);
    }

    getCollection(name: string) {
        return this.collections[name];
    }

    getCollectionNames() {
        return Object.keys(this.collections);
    }

    addSingle<T extends CollectionItem = CollectionItem>(
        name: string,
        single: Single<T>,
    ) {
        this.singles[name] = single;
        single.setServer(this);
        single.setName(name);
    }

    getSingle(name: string) {
        return this.singles[name];
    }

    getSingleNames() {
        return Object.keys(this.singles);
    }

    /**
     * @param {string} name
     * @param {string} params As decoded from the query string, e.g. { sort: "name", filter: {enabled:true}, slice: [10, 20] }
     */
    getCount(name: string, params?: Query) {
        return this.collections[name].getCount(params);
    }

    /**
     * @param {string} name
     * @param {string} params As decoded from the query string, e.g. { sort: "name", filter: {enabled:true}, slice: [10, 20] }
     */
    getAll(name: string, params?: Query) {
        return this.collections[name].getAll(params);
    }

    getOne(name: string, identifier: number, params?: Query) {
        return this.collections[name].getOne(identifier, params);
    }

    addOne(name: string, item: CollectionItem) {
        if (!Object.prototype.hasOwnProperty.call(this.collections, name)) {
            this.addCollection(
                name,
                new Collection([] as CollectionItem[], 'id'),
            );
        }
        return this.collections[name].addOne(item);
    }

    updateOne(name: string, identifier: number, item: CollectionItem) {
        return this.collections[name].updateOne(identifier, item);
    }

    removeOne(name: string, identifier: number) {
        return this.collections[name].removeOne(identifier);
    }

    getOnly(name: string, params?: Query) {
        return this.singles[name].getOnly();
    }

    updateOnly(name: string, item: CollectionItem) {
        return this.singles[name].updateOnly(item);
    }

    handleRequest(request: BaseRequest, opts?: RequestInit): BaseResponse {
        // Handle Single Objects
        for (const name of this.getSingleNames()) {
            const matches = request.url?.match(
                new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
            );
            if (!matches) continue;

            if (request.method === 'GET') {
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
            if (request.method === 'PUT') {
                try {
                    if (request.requestJson == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.updateOnly(name, request.requestJson),
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
            if (request.method === 'PATCH') {
                try {
                    if (request.requestJson == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.updateOnly(name, request.requestJson),
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
        const matches = request.url?.match(
            new RegExp(`^${this.baseUrl}\\/([^\\/?]+)(\\/(\\d+))?(\\?.*)?$`),
        );
        if (!matches) {
            return { status: 404, headers: {} };
        }
        const name = matches[1];
        const params = Object.assign(
            {},
            this.defaultQuery(name),
            request.params,
        );
        if (!matches[2]) {
            if (request.method === 'GET') {
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
            if (request.method === 'POST') {
                if (request.requestJson == null) {
                    return {
                        status: 400,
                        headers: {},
                    };
                }

                const newResource = this.addOne(name, request.requestJson);
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
            if (request.method === 'GET') {
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
            if (request.method === 'PUT') {
                try {
                    if (request.requestJson == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.updateOne(name, id, request.requestJson),
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
            if (request.method === 'PATCH') {
                try {
                    if (request.requestJson == null) {
                        return {
                            status: 400,
                            headers: {},
                        };
                    }
                    return {
                        status: 200,
                        body: this.updateOne(name, id, request.requestJson),
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
            if (request.method === 'DELETE') {
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
}

type BaseRequest = {
    url?: string;
    method?: string;
    requestJson?: Record<string, any> | undefined;
    params?: { [key: string]: any };
};

type BaseResponse = {
    status: number;
    body?: Record<string, any> | Record<string, any>[];
    headers: { [key: string]: string };
};
