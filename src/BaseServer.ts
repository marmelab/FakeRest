import { Collection } from './Collection.js';
import { Single } from './Single.js';
import type { CollectionItem, Query, QueryFunction } from './types.js';

export abstract class BaseServer {
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
}
