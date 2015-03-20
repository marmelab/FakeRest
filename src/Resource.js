import 'babel-core/polyfill';

export default class Resource {

    constructor(items=[], identifierName='id') {
        this.items = items;
        this.identifierName = identifierName;
    }

    getAll() {
        return this.items;
    }

    getOne(identifier) {
        let items = this.items.filter(item => item[this.identifierName] == identifier);
        if (items.length === 0) {
            return;
        }
        return items[0];
    }

    removeOne(identifier) {
        
    }
}
