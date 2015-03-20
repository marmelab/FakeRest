import 'babel-core/polyfill';
import Collection from 'Collection';

export default class Repository {
    constructor() {
        this.collections = {};
    }

    addCollection(name, resource) {
        this.collections[name] = resource;
    }

    getCollection(name) {
        return this.collections[name];
    }

    getAll(name) {
        if (!this.collections[name]) {
            throw new Error(`Unknown collection "${ name }"`)
        }
        return this.collections[name].getAll();
    }

    getOne(name, identifier) {
        if (!this.collections[name]) {
            throw new Error(`Unknown collection "${ name }"`)
        }
        return this.collections[name].getOne(identifier);
    }
}
