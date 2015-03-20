import 'babel-core/polyfill';

export default class Resource {

    constructor(items=[], identifierName='id') {
        this.items = items;
        this.identifierName = identifierName;
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

    removeOne(identifier) {
    }
}
