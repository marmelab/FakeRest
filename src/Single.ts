import cloneDeep from 'lodash/cloneDeep.js';
import type { Database } from './Database.ts';
import type { CollectionItem, Embed, Query } from './types.ts';

export class Single<T extends CollectionItem = CollectionItem> {
    obj: T | null = null;
    database: Database | null = null;
    name: string | null = null;

    constructor(obj: T) {
        if (!(obj instanceof Object)) {
            throw new Error(
                "Can't initialize a Single with anything except an object",
            );
        }
        this.obj = cloneDeep(obj);
    }

    /**
     * A Single may need to access other collections (e.g. for embedded
     * references) This is done through a reference to the parent database.
     */
    setDatabase(database: Database) {
        this.database = database;
    }

    setName(name: string) {
        this.name = name;
    }

    // No need to embed Singles, since they are by their nature top-level
    // No need to worry about remote references, (i.e. mysingleton_id=1) since
    // it is by definition a singleton
    _oneToManyEmbedder(resourceName: string) {
        return (item: T) => {
            if (this.database == null) {
                throw new Error("Can't embed references without a database");
            }
            const otherCollection = this.database.collections[resourceName];
            if (!otherCollection)
                throw new Error(
                    `Can't embed a non-existing collection ${resourceName}`,
                );
            // We have an array of ids {posts: [1,2]} (back refs are not valid
            // for singleton)
            // @ts-expect-error - For some reason, TS does not accept writing a generic types with the index signature
            item[resourceName] = otherCollection.getAll({
                filter: (i: CollectionItem) =>
                    item[resourceName].indexOf(
                        i[otherCollection.identifierName],
                    ) !== -1,
            });
            return item;
        };
    }

    _manyToOneEmbedder(resourceName: string) {
        const pluralResourceName = `${resourceName}s`;
        const referenceName = `${resourceName}_id`;
        return (item: T) => {
            if (this.database == null) {
                throw new Error("Can't embed references without a database");
            }
            const otherCollection =
                this.database.collections[pluralResourceName];
            if (!otherCollection)
                throw new Error(
                    `Can't embed a non-existing collection ${resourceName}`,
                );
            try {
                // @ts-expect-error - For some reason, TS does not accept writing a generic types with the index signature
                item[resourceName] = otherCollection.getOne(
                    item[referenceName],
                );
            } catch (e) {
                // Resource doesn't exist, so don't embed
            }
            return item;
        };
    }

    _itemEmbedder(embed: Embed) {
        const resourceNames = Array.isArray(embed) ? embed : [embed];
        const resourceEmbedders = resourceNames.map((resourceName) =>
            resourceName.endsWith('s')
                ? this._oneToManyEmbedder(resourceName)
                : this._manyToOneEmbedder(resourceName),
        );
        return (item: T) =>
            resourceEmbedders.reduce(
                (itemWithEmbeds, embedder) => embedder(itemWithEmbeds),
                item,
            );
    }

    getOnly(query?: Query) {
        let item = this.obj;
        if (query?.embed && this.database) {
            item = Object.assign({}, item); // Clone
            item = this._itemEmbedder(query.embed)(item);
        }
        return item;
    }

    updateOnly(item: T) {
        if (this.obj == null) {
            throw new Error("Can't update a non-existing object");
        }

        for (const key in item) {
            this.obj[key] = item[key];
        }
        return this.obj;
    }
}
