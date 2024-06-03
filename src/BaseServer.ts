import { Collection } from './Collection.js';
import { Single } from './Single.js';
import type { CollectionItem, Query, QueryFunction } from './types.js';

export abstract class BaseServer {
    baseUrl = '';
    identifierName = 'id';
    loggingEnabled = false;
    defaultQuery: QueryFunction = () => ({});
    batchUrl: string | null = null;
    collections: Record<string, Collection<any>> = {};
    singles: Record<string, Single<any>> = {};
    getNewId?: () => number | string;

    constructor({
        baseUrl = '',
        batchUrl = null,
        data,
        defaultQuery = () => ({}),
        identifierName = 'id',
        getNewId,
        loggingEnabled = false,
    }: BaseServerOptions = {}) {
        this.baseUrl = baseUrl;
        this.batchUrl = batchUrl;
        this.getNewId = getNewId;
        this.loggingEnabled = loggingEnabled;
        this.identifierName = identifierName;
        this.defaultQuery = defaultQuery;

        if (data) {
            this.init(data);
        }
    }

    /**
     * Shortcut for adding several collections if identifierName is always the same
     */
    init(data: Record<string, CollectionItem[] | CollectionItem>) {
        for (const name in data) {
            const value = data[name];
            if (Array.isArray(value)) {
                this.addCollection(
                    name,
                    new Collection({
                        items: value,
                        identifierName: this.identifierName,
                        getNewId: this.getNewId,
                    }),
                );
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

    getOne(name: string, identifier: string | number, params?: Query) {
        return this.collections[name].getOne(identifier, params);
    }

    addOne(name: string, item: CollectionItem) {
        if (!Object.prototype.hasOwnProperty.call(this.collections, name)) {
            this.addCollection(
                name,
                new Collection({
                    items: [],
                    identifierName: 'id',
                    getNewId: this.getNewId,
                }),
            );
        }
        return this.collections[name].addOne(item);
    }

    updateOne(name: string, identifier: string | number, item: CollectionItem) {
        return this.collections[name].updateOne(identifier, item);
    }

    removeOne(name: string, identifier: string | number) {
        return this.collections[name].removeOne(identifier);
    }

    getOnly(name: string, params?: Query) {
        return this.singles[name].getOnly();
    }

    updateOnly(name: string, item: CollectionItem) {
        return this.singles[name].updateOnly(item);
    }

    decodeRequest(request: BaseRequest): BaseRequest {
        for (const name of this.getSingleNames()) {
            const matches = request.url?.match(
                new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
            );

            if (matches) {
                request.single = name;
                return request;
            }
        }

        const matches = request.url?.match(
            new RegExp(`^${this.baseUrl}\\/([^\\/?]+)(\\/(\\w))?(\\?.*)?$`),
        );

        if (matches) {
            const name = matches[1];
            const params = Object.assign(
                {},
                this.defaultQuery(name),
                request.params,
            );

            request.collection = name;
            request.params = params;
            return request;
        }

        return request;
    }

    addBaseContext(context: FakeRestContext): FakeRestContext {
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
}

export type BaseServerOptions = {
    baseUrl?: string;
    batchUrl?: string | null;
    data?: Record<string, CollectionItem[] | CollectionItem>;
    defaultQuery?: QueryFunction;
    identifierName?: string;
    getNewId?: () => number | string;
    loggingEnabled?: boolean;
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
