import objectAssign from 'object.assign';
import 'array.prototype.findindex';
import 'string.prototype.endswith';

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
            let value = filter[key];
            if (key.indexOf('_lte') !== -1) {
                // less than or equal
                let realKey = key.replace(/(_lte)$/, '');
                return item => item[realKey] <= value;
            }
            if (key.indexOf('_gte') !== -1) {
                // less than or equal
                let realKey = key.replace(/(_gte)$/, '');
                return item => item[realKey] >= value;
            }
            if (key.indexOf('_lt') !== -1) {
                // less than or equal
                let realKey = key.replace(/(_lt)$/, '');
                return item => item[realKey] < value;
            }
            if (key.indexOf('_gt') !== -1) {
                // less than or equal
                let realKey = key.replace(/(_gt)$/, '');
                return item => item[realKey] > value;
            }
            if (Array.isArray(value)) {
                // where item in value
                return item => value.filter(v => v == item[key]).length > 0;
            }
            return item => {
                if (Array.isArray(item[key]) && typeof value == 'string') {
                    // simple filter but array item value: where value in item
                    return item[key].indexOf(value) !== -1;
                }
                if (typeof item[key] == 'boolean' && typeof value == 'string') {
                    // simple filter but boolean item value: boolean where
                    return item[key] == (value === 'true' ? true : false);
                }
                // simple filter
                return item[key] == value;
            };
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

export default class Collection {

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
            if (query.embed && this.server) {
                items = items
                    .map(item => objectAssign({}, item)) // clone item to avoid updating the original
                    .map(this._itemEmbedder(query.embed)); // embed reference
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
        if (query && query.embed && this.server) {
            item = objectAssign({}, item); // clone item to avoid updating the original
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
        return item;
    }

    updateOne(identifier, item) {
        let index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${ identifier }`);
        }
        for (let key in item) {
            this.items[index][key] = item[key];
        }
        return this.items[index];
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
