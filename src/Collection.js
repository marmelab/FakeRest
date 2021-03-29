import get from 'lodash/get';
import matches from 'lodash/matches';

const every = (array, predicate) =>
    array.reduce((acc, value) => acc && predicate(value), true);

const some = (array, predicate) =>
    array.reduce((acc, value) => acc || predicate(value), false);

const getArrayOfObjectsPaths = (keyParts, item) => 
    keyParts.reduce((acc, key, index) => {
        // If we already found an array, we don't need to explore further
        // For example with path `tags.name` when tags is an array of objects
        if (acc != undefined) {
            return acc;
        }
        
        let keyToArray = keyParts.slice(0, index + 1).join('.');
        let keyToItem = keyParts.slice(index + 1).join('.')
        let itemValue = get(item, keyToArray);
        
        // If the array is at the end of the key path, we will process it like we do normally with arrays
        // For example with path `deep.tags` where tags is the array. In this case, we return undefined
        return Array.isArray(itemValue) && index < keyParts.length - 1
            ? [keyToArray, keyToItem]
            : undefined;
    }, undefined);

const getSimpleFilter = (key, value) => {
    if (key.indexOf('_lte') !== -1) {
        // less than or equal
        let realKey = key.replace(/(_lte)$/, '');
        return item => get(item, realKey) <= value;
    }
    if (key.indexOf('_gte') !== -1) {
        // less than or equal
        let realKey = key.replace(/(_gte)$/, '');
        return item => get(item, realKey) >= value;
    }
    if (key.indexOf('_lt') !== -1) {
        // less than or equal
        let realKey = key.replace(/(_lt)$/, '');
        return item => get(item, realKey) < value;
    }
    if (key.indexOf('_gt') !== -1) {
        // less than or equal
        let realKey = key.replace(/(_gt)$/, '');
        return item => get(item, realKey) > value;
    }
    if (key.indexOf('_neq') !== -1) {
        // not equal
        let realKey = key.replace(/(_neq)$/, '');
        return item => get(item, realKey) != value;
    }
    if (Array.isArray(value)) {
        return item => {
            if (Array.isArray(get(item, key))) {
                // array filter and array item value: where all items in values
                return every(
                    value,
                    v => some(get(item, key), itemValue => itemValue == v)
                );
            }
            // where item in values
            return value.filter(v => v == get(item, key)).length > 0;
        }
    }

    if (typeof value === 'object') {
        return item => matches(value)(get(item, key));
    }

    return item => {
        if (Array.isArray(get(item, key)) && typeof value == 'string') {
            // simple filter but array item value: where value in item
            return get(item, key).indexOf(value) !== -1;
        }
        if (typeof get(item, key) == 'boolean' && typeof value == 'string') {
            // simple filter but boolean item value: boolean where
            return get(item, key) == (value === 'true' ? true : false);
        }
        // simple filter
        return get(item, key) == value;
    };
}

function filterItems(items, filter) {
    if (typeof filter === 'function') {
        return items.filter(filter);
    }
    if (filter instanceof Object) {
        // turn filter properties to functions
        var filterFunctions = Object.keys(filter).map(key => {
            if (key === 'q') {
                let regex = new RegExp(filter.q, 'i');
                // full-text filter
                return item => {
                    for (let itemKey in item) {
                        if (item[itemKey] && item[itemKey].match && item[itemKey].match(regex) !== null) return true;
                    }
                    return false;
                };
            }

            let keyParts = key.split('.');
            let value = filter[key];
            if (keyParts.length > 1) {
                return item => {
                    let arrayOfObjectsPaths = getArrayOfObjectsPaths(keyParts, item);

                    if (arrayOfObjectsPaths) {
                        let [arrayPath, valuePath] = arrayOfObjectsPaths;
                        // Check wether any item in the array matches the filter
                        const filteredArrayItems = filterItems(get(item, arrayPath), {[valuePath]: value});
                        return filteredArrayItems.length > 0;
                    } else {
                        return getSimpleFilter(key, value)(item);
                    }
                }
            }

            return getSimpleFilter(key, value);
        });
        // only the items matching all filters functions are in (AND logic)
        return items.filter(item =>
            filterFunctions.reduce((selected, filterFunction) => selected && filterFunction(item), true)
        );
    }
    throw new Error('Unsupported filter type');
}

function sortItems(items, sort) {
    if (typeof sort === 'function') {
        return items.sort(sort);
    }
    if (typeof sort === 'string') {
        return items.sort(function(a, b) {
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
        let key = sort[0];
        let direction = sort[1].toLowerCase() == 'asc' ? 1 : -1;
        return items.sort(function(a, b) {
          if (a[key] > b[key]) {
            return direction;
          }
          if (a[key] < b[key]) {
            return -1 * direction ;
          }
          return 0;
        });
    }
    throw new Error('Unsupported sort type');
}

function rangeItems(items, range) {
    if (Array.isArray(range)) {
        return items.slice(range[0], range[1] !== undefined ? range[1] + 1 : undefined);
    }
    throw new Error('Unsupported range type');
}

export class Collection {

    constructor(items=[], identifierName='id') {
        if (!Array.isArray(items)) {
            throw new Error('Can\'t initialize a Collection with anything else than an array of items');
        }
        this.sequence = 0; // id of the next item
        this.identifierName = identifierName;
        this.items = [];
        this.server = null;
        this.name = null;
        items.map(this.addOne.bind(this));
    }

    /**
     * A Collection may need to access other collections (e.g. for embedding references)
     * This is done through a reference to the parent server.
     */
    setServer(server) {
        this.server = server;
    }

    setName(name) {
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
    _oneToManyEmbedder(resourceName) {
        const singularResourceName = this.name.slice(0,-1);
        const referenceName = singularResourceName + '_id';
        return (item) => {
            const otherCollection = this.server.collections[resourceName];
            if (!otherCollection) throw new Error(`Can't embed a non-existing collection ${resourceName}`);
            if (Array.isArray(item[resourceName])) {
                // the many to one relationship is carried by an array of ids, e.g. { posts: [1, 2] } in authors
                item[resourceName] = otherCollection.getAll({
                    filter: i => item[resourceName].indexOf(i[otherCollection.identifierName]) !== -1
                });
            } else {
                // the many to one relationship is carried by references in the related collection, e.g. { author_id: 1 } in posts
                item[resourceName] = otherCollection.getAll({
                    filter: i => i[referenceName] == item[this.identifierName]
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
    _manyToOneEmbedder(resourceName) {
        const pluralResourceName = resourceName + 's';
        const referenceName = resourceName + '_id';
        return (item) => {
            const otherCollection = this.server.collections[pluralResourceName];
            if (!otherCollection) throw new Error(`Can't embed a non-existing collection ${resourceName}`);
            try {
                item[resourceName] = otherCollection.getOne(item[referenceName]);
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
    _itemEmbedder(embed) {
        const resourceNames = Array.isArray(embed) ? embed : [embed];
        const resourceEmbedders = resourceNames.map(resourceName =>
            resourceName.endsWith('s') ? this._oneToManyEmbedder(resourceName) : this._manyToOneEmbedder(resourceName)
        );
        return item => resourceEmbedders.reduce((itemWithEmbeds, embedder) => embedder(itemWithEmbeds), item);
    }

    getCount(query) {
        return this.getAll(query).length;
    }

    getAll(query) {
        var items = this.items.slice(0); // clone the array to avoid updating the core one
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
            items = items.map(item => Object.assign({}, item)) // clone item to avoid returning the original
            if (query.embed && this.server) {
                items = items.map(this._itemEmbedder(query.embed)); // embed reference
            }
        }
        return items;
    }

    getIndex(identifier) {
        return this.items.findIndex(item => item[this.identifierName] == identifier);
    }

    getOne(identifier, query) {
        let index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${ identifier }`);
        }
        let item = this.items[index];
        item = Object.assign({}, item); // clone item to avoid returning the original
        if (query && query.embed && this.server) {
            item = this._itemEmbedder(query.embed)(item); // embed reference
        }
        return item;
    }

    addOne(item) {
        var identifier = item[this.identifierName];
        if (identifier !== undefined) {
            if (this.getIndex(identifier) !== -1) {
                throw new Error(`An item with the identifier ${ identifier } already exists`);
            } else {
                this.sequence = Math.max(this.sequence, identifier) + 1;
            }
        } else {
            item[this.identifierName] = this.sequence++;
        }
        this.items.push(item);
        return Object.assign({}, item); // clone item to avoid returning the original;
    }

    updateOne(identifier, item) {
        let index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${ identifier }`);
        }
        for (let key in item) {
            this.items[index][key] = item[key];
        }
        return Object.assign({}, this.items[index]); // clone item to avoid returning the original
    }

    removeOne(identifier) {
        let index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${ identifier }`);
        }
        var item = this.items[index];
        this.items.splice(index, 1);
        if (identifier == (this.sequence - 1)) {
            this.sequence--;
        }
        return item;
    }
}
