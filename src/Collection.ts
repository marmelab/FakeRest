import get from 'lodash/get.js';
import matches from 'lodash/matches.js';
import cloneDeep from 'lodash/cloneDeep.js';
import type { Database } from './Database.ts';
import type {
    CollectionItem,
    Embed,
    Filter,
    Predicate,
    Query,
    Range,
    Sort,
} from './types.js';

export class Collection<T extends CollectionItem = CollectionItem> {
    sequence = 0;
    items: T[] = [];
    database: Database | null = null;
    name: string | null = null;
    identifierName = 'id';
    getNewId: () => number | string;

    constructor({
        items = [],
        identifierName = 'id',
        getNewId,
    }: {
        items?: T[];
        identifierName?: string;
        getNewId?: () => number | string;
    } = {}) {
        if (!Array.isArray(items)) {
            throw new Error(
                "Can't initialize a Collection with anything else than an array of items",
            );
        }
        this.identifierName = identifierName;
        this.getNewId = getNewId || this.getNewIdFromSequence;
        items.map(this.addOne.bind(this));
    }

    /**
     * A Collection may need to access other collections (e.g. for embedding references)
     * This is done through a reference to the parent database.
     */
    setDatabase(database: Database) {
        this.database = database;
    }

    setName(name: string) {
        this.name = name;
    }

    /**
     * Get a one to many embedder function for a given resource name
     *
     * @example embed posts for an author
     *
     *     authorsCollection._oneToManyEmbedder('posts')
     *
     * @returns Function item => item
     */
    _oneToManyEmbedder(resourceName: string) {
        if (this.name == null) {
            throw new Error("Can't embed references without a collection name");
        }
        const singularResourceName = this.name.slice(0, -1);
        const referenceName = `${singularResourceName}_id`;
        return (item: T) => {
            if (this.database == null) {
                throw new Error("Can't embed references without a database");
            }
            const otherCollection = this.database.collections[resourceName];
            if (!otherCollection)
                throw new Error(
                    `Can't embed a non-existing collection ${resourceName}`,
                );
            if (Array.isArray(item[resourceName])) {
                // the many to one relationship is carried by an array of ids, e.g. { posts: [1, 2] } in authors
                // @ts-expect-error - For some reason, TS does not accept writing a generic types with the index signature
                item[resourceName] = otherCollection.getAll({
                    filter: (i: T) =>
                        item[resourceName].indexOf(
                            i[otherCollection.identifierName],
                        ) !== -1,
                });
            } else {
                // the many to one relationship is carried by references in the related collection, e.g. { author_id: 1 } in posts
                // @ts-expect-error - For some reason, TS does not accept writing a generic types with the index signature
                item[resourceName] = otherCollection.getAll({
                    filter: (i: T) =>
                        i[referenceName] === item[this.identifierName],
                });
            }
            return item;
        };
    }

    /**
     * Get a many to one embedder function for a given resource name
     *
     * @example embed author for a post
     *
     *     postsCollection._manyToOneEmbedder('author')
     *
     * @returns Function item => item
     */
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
                // resource doesn't exist in the related collection - do not embed
            }
            return item;
        };
    }

    /**
     * @param String[] An array of resource names, e.g. ['books', 'country']
     * @returns Function item => item
     */
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

    getCount(query?: Query) {
        return this.getAll(query).length;
    }

    getAll(query?: Query) {
        let items = this.items.slice(0); // clone the array to avoid updating the core one
        if (query) {
            if (query.filter) {
                items = filterItems(items, query.filter);
            }
            if (query.sort) {
                items = sortItems(items, query.sort);
            }
            if (query.range) {
                items = rangeItems(items, query.range);
            }
            items = items.map((item) => Object.assign({}, item)); // clone item to avoid returning the original
            if (query.embed && this.database) {
                items = items.map(this._itemEmbedder(query.embed)); // embed reference
            }
        }
        return items;
    }

    getIndex(identifier: number | string) {
        return this.items.findIndex(
            // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
            (item) => item[this.identifierName] == identifier,
        );
    }

    getOne(identifier: number | string, query?: Query) {
        const index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${identifier}`);
        }
        let item = this.items[index];
        item = Object.assign({}, item); // clone item to avoid returning the original
        if (query?.embed && this.database) {
            item = this._itemEmbedder(query.embed)(item); // embed reference
        }
        return item;
    }

    getNewIdFromSequence() {
        return this.sequence++;
    }

    addOne(item: T) {
        const clone = cloneDeep(item);
        const identifier = clone[this.identifierName];
        if (identifier != null) {
            if (this.getIndex(identifier) !== -1) {
                throw new Error(
                    `An item with the identifier ${identifier} already exists`,
                );
            }
            if (typeof identifier === 'number') {
                this.sequence = Math.max(this.sequence, identifier) + 1;
            }
        } else {
            // @ts-expect-error - For some reason, TS does not accept writing a generic types with the index signature
            clone[this.identifierName] = this.getNewId();
        }
        this.items.push(clone);
        return clone; // clone item to avoid returning the original;
    }

    updateOne(identifier: number | string, item: T) {
        const index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${identifier}`);
        }
        for (const key in item) {
            this.items[index][key] = item[key];
        }
        return Object.assign({}, this.items[index]); // clone item to avoid returning the original
    }

    removeOne(identifier: number | string) {
        const index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${identifier}`);
        }
        const item = this.items[index];
        this.items.splice(index, 1);
        // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
        if (typeof identifier === 'number' && identifier == this.sequence - 1) {
            this.sequence--;
        }
        return item;
    }
}

const every = <T extends CollectionItem = CollectionItem>(
    array: T[],
    predicate: Predicate,
) => array.reduce((acc, value) => acc && predicate(value), true);

const some = <T extends CollectionItem = CollectionItem>(
    array: T[],
    predicate: Predicate,
) => array.reduce((acc, value) => acc || predicate(value), false);

const getArrayOfObjectsPaths = <T extends CollectionItem = CollectionItem>(
    keyParts: string[],
    item: T,
) =>
    keyParts.reduce(
        (acc, key, index) => {
            // If we already found an array, we don't need to explore further
            // For example with path `tags.name` when tags is an array of objects
            if (acc != null) {
                return acc;
            }

            const keyToArray = keyParts.slice(0, index + 1).join('.');
            const keyToItem = keyParts.slice(index + 1).join('.');
            const itemValue = get(item, keyToArray);

            // If the array is at the end of the key path, we will process it like we do normally with arrays
            // For example with path `deep.tags` where tags is the array. In this case, we return undefined
            return Array.isArray(itemValue) && index < keyParts.length - 1
                ? [keyToArray, keyToItem]
                : undefined;
        },
        undefined as Array<string> | undefined,
    );

const getSimpleFilter = (key: string, value: any) => {
    if (key.indexOf('_q') !== -1) {
        // text search
        const realKey = key.replace(/(_q)$/, '');
        const regex = new RegExp(value.toString(), 'i');

        return <T extends CollectionItem = CollectionItem>(item: T) =>
            get(item, realKey)?.toString().match(regex) !== null;
    }
    if (key.indexOf('_lte') !== -1) {
        // less than or equal
        const realKey = key.replace(/(_lte)$/, '');
        return <T extends CollectionItem = CollectionItem>(item: T) =>
            get(item, realKey) <= value;
    }
    if (key.indexOf('_gte') !== -1) {
        // less than or equal
        const realKey = key.replace(/(_gte)$/, '');
        return <T extends CollectionItem = CollectionItem>(item: T) =>
            get(item, realKey) >= value;
    }
    if (key.indexOf('_lt') !== -1) {
        // less than or equal
        const realKey = key.replace(/(_lt)$/, '');
        return <T extends CollectionItem = CollectionItem>(item: T) =>
            get(item, realKey) < value;
    }
    if (key.indexOf('_gt') !== -1) {
        // less than or equal
        const realKey = key.replace(/(_gt)$/, '');
        return <T extends CollectionItem = CollectionItem>(item: T) =>
            get(item, realKey) > value;
    }
    if (key.indexOf('_neq_any') !== -1) {
        // not equal to any
        const realKey = key.replace(/(_neq_any)$/, '');
        const finalValue = Array.isArray(value) ? value : [value];
        return <T extends CollectionItem = CollectionItem>(
            item: T,
            // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
        ) => finalValue.every((val) => get(item, realKey) != val);
    }
    if (key.indexOf('_neq') !== -1) {
        // not equal
        const realKey = key.replace(/(_neq)$/, '');
        return <T extends CollectionItem = CollectionItem>(
            item: T,
            // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
        ) => get(item, realKey) != value;
    }
    if (key.indexOf('_eq_any') !== -1) {
        // equal any
        const realKey = key.replace(/(_eq_any)$/, '');
        const finalValue = Array.isArray(value) ? value : [value];
        return <T extends CollectionItem = CollectionItem>(
            item: T,
            // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
        ) => finalValue.some((val) => get(item, realKey) == val);
    }
    if (key.indexOf('_eq') !== -1) {
        // equal
        const realKey = key.replace(/(_eq)$/, '');
        return <T extends CollectionItem = CollectionItem>(
            item: T,
            // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
        ) => get(item, realKey) == value;
    }
    if (key.indexOf('_inc_any') !== -1) {
        // include any
        const realKey = key.replace(/(_inc_any)$/, '');
        const finalValue = Array.isArray(value) ? value : [value];
        return <T extends CollectionItem = CollectionItem>(item: T) =>
            finalValue.some((val) => {
                const itemValue = get(item, realKey);
                if (Array.isArray(itemValue)) {
                    return itemValue.includes(val);
                }
                if (typeof itemValue === 'string') {
                    return itemValue.includes(val);
                }
                return false;
            });
    }
    if (key.indexOf('_inc') !== -1) {
        // includes all
        const realKey = key.replace(/(_inc)$/, '');
        const finalValue = Array.isArray(value) ? value : [value];
        return <T extends CollectionItem = CollectionItem>(item: T) =>
            finalValue.every((val) => {
                const itemValue = get(item, realKey);
                if (Array.isArray(itemValue)) {
                    return itemValue.includes(val);
                }
                if (typeof itemValue === 'string') {
                    return itemValue.includes(val);
                }
                return false;
            });
    }
    if (key.indexOf('_ninc_any') !== -1) {
        // does not include any
        const realKey = key.replace(/(_ninc_any)$/, '');
        const finalValue = Array.isArray(value) ? value : [value];
        return <T extends CollectionItem = CollectionItem>(item: T) =>
            finalValue.every((val) => {
                const itemValue = get(item, realKey);
                if (Array.isArray(itemValue)) {
                    return !itemValue.includes(val);
                }
                if (typeof itemValue === 'string') {
                    return !itemValue.includes(val);
                }
                return false;
            });
    }
    if (Array.isArray(value)) {
        return <T extends CollectionItem = CollectionItem>(item: T) => {
            if (Array.isArray(get(item, key))) {
                // array filter and array item value: where all items in values
                return every(value, (v) => {
                    const itemValue = get(item, key);
                    if (Array.isArray(itemValue)) {
                        // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
                        return some(itemValue, (itemValue) => itemValue == v);
                    }
                    return false;
                });
            }
            // where item in values
            // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
            return value.filter((v) => v == get(item, key)).length > 0;
        };
    }

    if (typeof value === 'object') {
        return <T extends CollectionItem = CollectionItem>(item: T) =>
            matches(value)(get(item, key));
    }

    return <T extends CollectionItem = CollectionItem>(item: T) => {
        const itemValue = get(item, key);
        if (Array.isArray(itemValue) && typeof value === 'string') {
            // simple filter but array item value: where value in item
            return itemValue.indexOf(value) !== -1;
        }
        if (typeof itemValue === 'boolean' && typeof value === 'string') {
            // simple filter but boolean item value: boolean where
            return itemValue === (value === 'true');
        }
        // simple filter
        // biome-ignore lint/suspicious/noDoubleEquals: we want implicit type coercion
        return itemValue == value;
    };
};

function filterItems<T extends CollectionItem = CollectionItem>(
    items: T[],
    filter: Filter,
) {
    if (typeof filter === 'function') {
        return items.filter(filter);
    }
    if (filter instanceof Object) {
        // turn filter properties to functions
        const filterFunctions = Object.keys(filter).map((key) => {
            if (key === 'q' && typeof filter.q === 'string') {
                const regex = buildRegexSearch(filter.q);

                const filterWithQuery = <
                    T2 extends CollectionItem = CollectionItem,
                >(
                    item: T2,
                ) => {
                    for (const itemKey in item) {
                        const itemValue = item[itemKey];
                        if (typeof itemValue === 'object') {
                            if (filterWithQuery(itemValue as CollectionItem)) {
                                return true;
                            }
                        }

                        if (
                            itemValue &&
                            typeof itemValue === 'string' &&
                            itemValue.match &&
                            itemValue.match(regex) !== null
                        )
                            return true;
                    }
                    return false;
                };
                // full-text filter
                return filterWithQuery;
            }

            const keyParts = key.split('.');
            const value = filter[key];
            if (keyParts.length > 1) {
                return <T2 extends CollectionItem = CollectionItem>(
                    item: T2,
                ): boolean => {
                    const arrayOfObjectsPaths = getArrayOfObjectsPaths(
                        keyParts,
                        item,
                    );

                    if (arrayOfObjectsPaths) {
                        const [arrayPath, valuePath] = arrayOfObjectsPaths;
                        const itemValue = get(item, arrayPath);
                        if (Array.isArray(itemValue)) {
                            // Check wether any item in the array matches the filter
                            const filteredArrayItems = filterItems(itemValue, {
                                [valuePath]: value,
                            });
                            return filteredArrayItems.length > 0;
                        }
                        return false;
                    }
                    return getSimpleFilter(key, value)(item);
                };
            }

            return getSimpleFilter(key, value);
        });
        // only the items matching all filters functions are in (AND logic)
        return items.filter((item) =>
            filterFunctions.reduce(
                (selected, filterFunction) => selected && filterFunction(item),
                true,
            ),
        );
    }
    throw new Error('Unsupported filter type');
}

function sortItems<T extends CollectionItem = CollectionItem>(
    items: T[],
    sort: Sort,
) {
    if (typeof sort === 'function') {
        return items.sort(sort);
    }
    if (typeof sort === 'string') {
        return items.sort((a, b) => {
            if (a[sort] > b[sort]) {
                return 1;
            }
            if (a[sort] < b[sort]) {
                return -1;
            }
            return 0;
        });
    }
    if (Array.isArray(sort)) {
        const key = sort[0];
        const direction = sort[1].toLowerCase() === 'asc' ? 1 : -1;
        return items.sort((a: T, b: T) => {
            if (a[key] > b[key]) {
                return direction;
            }
            if (a[key] < b[key]) {
                return -1 * direction;
            }
            return 0;
        });
    }
    throw new Error('Unsupported sort type');
}

function rangeItems<T extends CollectionItem = CollectionItem>(
    items: T[],
    range: Range,
) {
    if (Array.isArray(range)) {
        return items.slice(
            range[0],
            range[1] !== undefined ? range[1] + 1 : undefined,
        );
    }
    throw new Error('Unsupported range type');
}

function buildRegexSearch(input: string) {
    // Trim the input to remove leading and trailing whitespace
    const trimmedInput = input.trim();

    // Escape special characters in the input to prevent regex injection
    const escapedInput = trimmedInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Split the input into words
    const words = escapedInput.split(' ');

    // Create a regex pattern to match any of the words
    const pattern = words.map((word) => `(${word})`).join('|');

    // Create a new RegExp object with the pattern, case insensitive
    const regex = new RegExp(pattern, 'i');

    return regex;
}
