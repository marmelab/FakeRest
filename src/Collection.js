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

    getAll() {
        return this.items;
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
