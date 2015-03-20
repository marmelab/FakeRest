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

    getCount(query) {
        return this.getAll(query).length;
    }

    getAll(query) {
        var items = this.items.map(item => item);
        if (query) {
            if (query.sort) {
                if (typeof query.sort === 'function') {
                    items = items.sort(query.sort);
                } else if (typeof query.sort === 'string') {
                    let key = query.sort;
                    items = items.sort(function(a, b) {
                      if (a[key] > b[key]) {
                        return 1;
                      }
                      if (a[key] < b[key]) {
                        return -1;
                      }
                      return 0;
                    });
                } else if (Array.isArray(query.sort)) {
                    let key = query.sort[0];
                    let direction = query.sort[1].toLowerCase() == 'asc' ? 1 : -1;
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
            if (query.filter) {
                if (typeof query.filter === 'function') {
                    items = items.filter(query.filter);
                } else if (query.filter instanceof Object) {
                    function filter(item) {
                        for (let key in query.filter) {
                            if (item[key] != query.filter[key]) return false;
                        }
                        return true;
                    }
                    items = items.filter(filter);
                }
            }
            if (query.slice) {
                items = items.slice(query.slice[0], query.slice[1]);
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
