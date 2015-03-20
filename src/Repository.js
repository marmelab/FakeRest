import 'babel-core/polyfill';
import Collection from 'Collection';

function parseQueryString(queryString) {
    if (!queryString) {
        return {};
    }
    let queryObject = {};
    let queryElements = queryString.split('&');

    queryElements.map(function(queryElement) {
        if (queryElement.indexOf('=') === -1) {
            queryObject[queryElement] = true;
        } else {
            let [key, value] = queryElement.split('=');
            if (value.indexOf('[') === 0 || value.indexOf('{') === 0) {
                value = JSON.parse(value);
            }
            queryObject[key.trim()] = value;
        }
    })
    return queryObject;
}

export default class Repository {
    constructor() {
        this.collections = {};
    }

    addCollection(name, collection) {
        this.collections[name] = collection;
    }

    getCollection(name) {
        return this.collections[name];
    }

    checkName(name) {
        if (!this.collections[name]) {
            throw new Error(`Unknown collection "${ name }"`)
        }
    }

    /**
     * @param {string} name
     * @param {string} queryString As decoded from the query string, e.g. sort=name&filter={enabled:true}&slice=[10, 20]
     */
    getCount(name, queryString) {
        this.checkName(name);
        return this.collections[name].getCount(parseQueryString(queryString));
    }

    /**
     * @param {string} name
     * @param {string} queryString As decoded from the query string, e.g. sort=name&filter={enabled:true}&slice=[10, 20]
     */
    getAll(name, queryString) {
        this.checkName(name);
        return this.collections[name].getAll(parseQueryString(queryString));
    }

    getOne(name, identifier) {
        this.checkName(name);
        return this.collections[name].getOne(identifier);
    }

    addOne(name, item) {
        this.checkName(name);
        return this.collections[name].addOne(item);
    }

    updateOne(name, identifier, item) {
        this.checkName(name);
        return this.collections[name].updateOne(identifier, item);
    }

    removeOne(name, identifier) {
        this.checkName(name);
        return this.collections[name].removeOne(identifier);
    }
}
