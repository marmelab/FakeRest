import 'babel-core/polyfill';
import Resource from 'Resource';

export default class Repository {
    constructor() {
        this.resources = {};
    }

    addResource(name, resource) {
        this.resources[name] = resource;
    }

    getResource(name) {
        return this.resources[name];
    }

    getAll(name) {
        if (!this.resources[name]) {
            throw new Error(`Unknown resource "${ name }"`)
        }
        return this.resources[name].getAll();
    }

    getOne(name, identifier) {
        if (!this.resources[name]) {
            throw new Error(`Unknown resource "${ name }"`)
        }
        return this.resources[name].getOne(identifier);
    }
}
