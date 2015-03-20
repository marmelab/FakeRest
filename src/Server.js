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

export default class Server {
    constructor(baseUrl='') {
        this.baseUrl = baseUrl;
        this.collections = {};
    }

    /**
     * Shortcut for adding several collections if identifierName is always 'id'
     */
    init(data) {
        for (let name in data) {
            this.addCollection(name, new Collection(data));
        }
    }

    addCollection(name, collection) {
        this.collections[name] = collection;
    }

    getCollection(name) {
        return this.collections[name];
    }

    getCollectionNames() {
        return Object.keys(this.collections);
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

    /**
     * @param {FakeXMLHttpRequest} request
     *
     * String request.url The URL set on the request object.
     * String request.method The request method as a string.
     * Object request.requestHeaders An object of all request headers, i.e.:
     *     {
     *         "Accept": "text/html",
     *         "Connection": "keep-alive"
     *     }
     * String request.requestBody The request body
     * String request.username Username, if any.
     * String request.password Password, if any.
     */
    handle(request) {
        for (let name of this.getCollectionNames()) {
            let match = new RegExp(this.baseUrl + '/' + name).test(request.url);
            if (match) {
                if (request.method == 'POST') {
                    return request.respond(200, [], this.addOne(name, JSON.parse(request.requestBody)));
                }
                if (request.method == 'GET') {
                    return request.respond(200, { "Content-Type": "application/json" }, JSON.stringify(this.getAll(name)));
                }
            }
            let matches = request.url.match(new RegExp(this.baseUrl + '/' + name + '/(d+)' ));
            if (matches) {
                if (request.method == 'PUT') {
                    return request.respond(200, [], this.updateOne(name, matches[0], JSON.parse(request.requestBody)));
                }
                if (request.method == 'DELETE') {
                    return request.respond(200, [], this.removeOne(name, matches[0]));
                }
                if (request.method == 'GET') {
                    return request.respond(200, [], this.getOne(name, matches[0]));
                }

            }
        }
    }
}
