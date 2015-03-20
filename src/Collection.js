import 'babel-core/polyfill';

export default class Collection {

    constructor(items=[], identifierName='id') {
        if (!Array.isArray(items)) {
            throw new Error('Can\'t initialize a Collection with anything else than an array of items');
        }
        this.sequence = 0;
        this.identifierName = identifierName;
        this.items = [];
        items.map(this.addOne.bind(this));
    }

    getAll(options) {
        var items = this.items.map(item => item);
        if (options && options.sort) {
            if (typeof options.sort === 'function') {
                items = items.sort(options.sort);
            } else if (typeof options.sort === 'string') {
                let key = options.sort;
                items = items.sort(function(a, b) {
                  if (a[key] > b[key]) {
                    return 1;
                  }
                  if (a[key] < b[key]) {
                    return -1;
                  }
                  return 0;
                });
            } else if (Array.isArray(options.sort)) {
                let key = options.sort[0];
                let direction = options.sort[1].toLowerCase() == 'asc' ? 1 : -1;
                items = items.sort(function(a, b) {
                  if (a[key] > b[key]) {
                    return direction;
                  }
                  if (a[key] < b[key]) {
                    return -1 * direction ;
                  }
                  return 0;
                });
            }
        }
        if (options && options.filter) {
            if (typeof options.filter === 'function') {
                items = items.filter(options.filter);
            } else if (options.filter instanceof Object) {
                function filter(item) {
                    for (let key in options.filter) {
                        if (item[key] != options.filter[key]) return false;
                    }
                    return true;
                }
                items = items.filter(filter);
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
            return;
        }
        return this.items[index];
    }

    addOne(item) {
        var identifier = item[this.identifierName];
        if (identifier !== undefined) {
            if (this.getIndex(identifier) !== -1) {
                throw new Error(`An item with the identifier ${ identifier } already exists`);
            } else {
                this.sequence = Math.max(this.sequence, identifier)
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
        this.items[index] = item;
        return item;
    }

    removeOne(identifier) {
        let index = this.getIndex(identifier);
        if (index === -1) {
            throw new Error(`No item with identifier ${ identifier }`);
        }
        var item = this.items[index];
        this.items.splice(index, 1);
        if (identifier == this.sequence) {
            this.sequence--;
        }
        return item;
    }
}
