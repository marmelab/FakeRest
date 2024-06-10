import { Collection } from './Collection.ts';
import { Single } from './Single.ts';
import type { CollectionItem, Query, QueryFunction } from './types.ts';

export class Database {
    identifierName = 'id';
    collections: Record<string, Collection<any>> = {};
    singles: Record<string, Single<any>> = {};
    getNewId?: () => number | string;

    constructor({
        data,
        identifierName = 'id',
        getNewId,
    }: DatabaseOptions = {}) {
        this.getNewId = getNewId;
        this.identifierName = identifierName;

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

    addCollection<T extends CollectionItem = CollectionItem>(
        name: string,
        collection: Collection<T>,
    ) {
        this.collections[name] = collection;
        collection.setDatabase(this);
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
        single.setDatabase(this);
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
                    identifierName: this.identifierName,
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
}

export type DatabaseOptions = {
    baseUrl?: string;
    batchUrl?: string | null;
    data?: Record<string, CollectionItem[] | CollectionItem>;
    defaultQuery?: QueryFunction;
    identifierName?: string;
    getNewId?: () => number | string;
    loggingEnabled?: boolean;
};
