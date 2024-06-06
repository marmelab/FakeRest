import { Collection } from './Collection.js';
import { Single } from './Single.js';
import type { CollectionItem, Query, QueryFunction } from './types.js';

/**
 * This base class does not need generics so we can reference it in Collection and Single
 * without having to propagate mocking implementation generics nor requiring the user to specify them.
 * The BaseServerWithMiddlewares class is the one that needs to have generic parameters which are
 * provided by the mocking implementation server classes.
 */
export abstract class AbstractBaseServer {
    baseUrl = '';
    identifierName = 'id';
    defaultQuery: QueryFunction = () => ({});
    collections: Record<string, Collection<any>> = {};
    singles: Record<string, Single<any>> = {};
    getNewId?: () => number | string;

    constructor({
        baseUrl = '',
        data,
        defaultQuery = () => ({}),
        identifierName = 'id',
        getNewId,
    }: BaseServerOptions = {}) {
        this.baseUrl = baseUrl;
        this.getNewId = getNewId;
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

    /**
     * @param Function ResourceName => object
     */
    setDefaultQuery(query: QueryFunction) {
        this.defaultQuery = query;
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
}

export type BaseServerOptions = {
    baseUrl?: string;
    batchUrl?: string | null;
    data?: Record<string, CollectionItem[] | CollectionItem>;
    defaultQuery?: QueryFunction;
    identifierName?: string;
    getNewId?: () => number | string;
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
