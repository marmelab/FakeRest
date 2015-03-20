import 'babel-core/polyfill';

export default class Repository {
    constructor() {
        this.resources = {};
        this.identifierNames = {};
    }

    setResource(name, dataObject, identifierName='id') {
        this.resources[name] = dataObject;
        this.identifierNames[name] = identifierName;
    }

    inspect() {
        return [this.resources, this.identifierNames];
    }

    getAll(name) {
        if (!this.resources[name]) {
            throw new Error(`Unknown resource "${ name }"`)
        }
        return this.resources[name];
    }

    getOne(name, identifier) {
        if (!this.resources[name]) {
            throw new Error(`Unknown resource "${ name }"`)
        }
        let resources = this.resources[name].filter(resource => resource[this.identifierNames[name]] == identifier);
        if (resources.length === 0) {
            return;
        }
        return resources[0];
    }
}
