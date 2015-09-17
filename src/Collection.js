import 'array.prototype.findindex';

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
                // not strict indexOf
                return item => value.filter(v => v == item[key]).length > 0;
            }
            return item => {
                if (Object.prototype.toString.call(item[key]) == '[object Array]' && typeof filter[key] == 'string') {
                    // simple filter but array item value: make that a where ... in
                    return item[key].indexOf(value) !== -1;
                }
                if (typeof item[key] == 'boolean' && typeof filter[key] == 'string') {
                    // simple filter but boolean item value: make that a boolean where
                    return item[key] == (value === 'true' ? true : false);
                }
                // simple filter
                return item[key] == value;
            }
        });
        // only the items matching all filters functions are in (AND logic)
        return items.filter(item => {
            return filterFunctions.reduce((selected, filterFunction) => {
                return selected && filterFunction(item);
            }, true);
        })
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
        items.map(this.addOne.bind(this));
    }

    getCount(query) {
        return this.getAll(query).length;
    }

    getAll(query) {
        var items = this.items.map(item => item);
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
        }
        return items;
    }

    getIndex(identifier) {
        return this.items.findIndex(item => item[this.identifierName] == identifier);
    }

    getOne(identifier) {
        let index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${ identifier }`);
        }
        return this.items[index];
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
