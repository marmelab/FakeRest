import { Collection } from './Collection';
import { Single } from './Single';
import { parseQueryString } from './parseQueryString';

export class Server {
    baseUrl = null;
    loggingEnabled = false;
    defaultQuery = () => {};
    batchUrl = null;
    collections = {};
    singles = {};
    requestInterceptors = [];
    responseInterceptors = [];

    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Shortcut for adding several collections if identifierName is always 'id'
     */
    init(data) {
        for (const name in data) {
            if (Array.isArray(data[name])) {
                this.addCollection(name, new Collection(data[name], 'id'));
            } else {
                this.addSingle(name, new Single(data[name]));
            }
        }
    }

    toggleLogging() {
        this.loggingEnabled = !this.loggingEnabled;
    }

    /**
     * @param Function ResourceName => object
     */
    setDefaultQuery(query) {
        this.defaultQuery = query;
    }

    setBatchUrl(batchUrl) {
        this.batchUrl = batchUrl;
    }

    /**
     * @deprecated use setBatchUrl instead
     */
    setBatch(url) {
        console.warn(
            'Server.setBatch() is deprecated, use Server.setBatchUrl() instead',
        );
        this.batchUrl = url;
    }

    addCollection(name, collection) {
        this.collections[name] = collection;
        collection.setServer(this);
        collection.setName(name);
    }

    getCollection(name) {
        return this.collections[name];
    }

    getCollectionNames() {
        return Object.keys(this.collections);
    }

    addSingle(name, single) {
        this.singles[name] = single;
        single.setServer(this);
        single.setName(name);
    }

    getSingle(name) {
        return this.singles[name];
    }

    getSingleNames() {
        return Object.keys(this.singles);
    }

    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * @param {string} name
     * @param {string} params As decoded from the query string, e.g. { sort: "name", filter: {enabled:true}, slice: [10, 20] }
     */
    getCount(name, params) {
        return this.collections[name].getCount(params);
    }

    /**
     * @param {string} name
     * @param {string} params As decoded from the query string, e.g. { sort: "name", filter: {enabled:true}, slice: [10, 20] }
     */
    getAll(name, params) {
        return this.collections[name].getAll(params);
    }

    getOne(name, identifier, params) {
        return this.collections[name].getOne(identifier, params);
    }

    addOne(name, item) {
        if (!Object.prototype.hasOwnProperty.call(this.collections, name)) {
            this.addCollection(name, new Collection([], 'id'));
        }
        return this.collections[name].addOne(item);
    }

    updateOne(name, identifier, item) {
        return this.collections[name].updateOne(identifier, item);
    }

    removeOne(name, identifier) {
        return this.collections[name].removeOne(identifier);
    }

    getOnly(name, params) {
        return this.singles[name].getOnly();
    }

    updateOnly(name, item) {
        return this.singles[name].updateOnly(item);
    }

    decode(request) {
        request.queryString = decodeURIComponent(
            request.url.slice(request.url.indexOf('?') + 1),
        );
        request.params = parseQueryString(request.queryString);
        if (request.requestBody) {
            try {
                request.json = JSON.parse(request.requestBody);
            } catch (error) {
                // body isn't JSON, skipping
            }
        }
        return this.requestInterceptors.reduce(
            (previous, current) => current(previous),
            request,
        );
    }

    respond(body, headers, request, status = 200) {
        if (!headers) {
            // biome-ignore lint: FIXME
            headers = {};
        }
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        let response = { status: status, headers: headers, body: body };
        response = this.responseInterceptors.reduce(
            (previous, current) => current(previous, request),
            response,
        );
        this.log(request, response);

        return request.respond(
            response.status,
            response.headers,
            JSON.stringify(response.body),
        );
    }

    log(request, response) {
        if (!this.loggingEnabled) return;
        if (console.group) {
            // Better logging in Chrome
            console.groupCollapsed(request.method, request.url, '(FakeRest)');
            console.group('request');
            console.log(request.method, request.url);
            console.log('headers', request.requestHeaders);
            console.log('body   ', request.requestBody);
            console.groupEnd();
            console.group('response', response.status);
            console.log('headers', response.headers);
            console.log('body   ', response.body);
            console.groupEnd();
            console.groupEnd();
        } else {
            console.log(
                'FakeRest request ',
                request.method,
                request.url,
                'headers',
                request.requestHeaders,
                'body',
                request.requestBody,
            );
            console.log(
                'FakeRest response',
                response.status,
                'headers',
                response.headers,
                'body',
                response.body,
            );
        }
    }

    batch(request) {
        const json = request.json;
        const handle = this.handle.bind(this);

        const jsonResponse = Object.keys(json).reduce(
            (jsonResponse, requestName) => {
                let subResponse;
                const sub = {
                    url: json[requestName],
                    method: 'GET',
                    params: {},
                    respond: (code, headers, body) => {
                        subResponse = {
                            code: code,
                            headers: Object.keys(headers || {}).map(
                                (headerName) => ({
                                    name: headerName,
                                    value: headers[headerName],
                                }),
                            ),
                            body: body || {},
                        };
                    },
                };
                handle(sub);

                jsonResponse[requestName] = subResponse || {
                    code: 404,
                    headers: [],
                    body: {},
                };

                return jsonResponse;
            },
            {},
        );

        return this.respond(jsonResponse, {}, request, 200);
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
        // biome-ignore lint: FIXME
        request = this.decode(request);

        if (
            this.batchUrl &&
            this.batchUrl === request.url &&
            request.method === 'POST'
        ) {
            return this.batch(request);
        }

        // Handle Single Objects
        for (const name of this.getSingleNames()) {
            const matches = request.url.match(
                new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
            );
            if (!matches) continue;

            if (request.method === 'GET') {
                try {
                    const item = this.getOnly(name);
                    return this.respond(item, null, request);
                } catch (error) {
                    return request.respond(404);
                }
            }
            if (request.method === 'PUT') {
                try {
                    const item = this.updateOnly(name, request.json);
                    return this.respond(item, null, request);
                } catch (error) {
                    return request.respond(404);
                }
            }
            if (request.method === 'PATCH') {
                try {
                    const item = this.updateOnly(name, request.json);
                    return this.respond(item, null, request);
                } catch (error) {
                    return request.respond(404);
                }
            }
        }

        // Handle collections
        const matches = request.url.match(
            new RegExp(`^${this.baseUrl}\\/([^\\/?]+)(\\/(\\d+))?(\\?.*)?$`),
        );
        if (!matches) return;
        const name = matches[1];
        const params = Object.assign(
            {},
            this.defaultQuery(name),
            request.params,
        );
        if (!matches[2]) {
            if (request.method === 'GET') {
                if (!this.getCollection(name)) {
                    return;
                }
                const count = this.getCount(
                    name,
                    params.filter ? { filter: params.filter } : {},
                );
                let items;
                let contentRange;
                let status;
                if (count > 0) {
                    items = this.getAll(name, params);
                    const first = params.range ? params.range[0] : 0;
                    const last = params.range
                        ? Math.min(items.length - 1 + first, params.range[1])
                        : items.length - 1;
                    contentRange = `items ${first}-${last}/${count}`;
                    status = items.length === count ? 200 : 206;
                } else {
                    items = [];
                    contentRange = 'items */0';
                    status = 200;
                }
                return this.respond(
                    items,
                    { 'Content-Range': contentRange },
                    request,
                    status,
                );
            }
            if (request.method === 'POST') {
                const newResource = this.addOne(name, request.json);
                const newResourceURI = `${this.baseUrl}/${name}/${
                    newResource[this.getCollection(name).identifierName]
                }`;
                return this.respond(
                    newResource,
                    { Location: newResourceURI },
                    request,
                    201,
                );
            }
        } else {
            if (!this.getCollection(name)) {
                return;
            }
            const id = matches[3];
            if (request.method === 'GET') {
                try {
                    const item = this.getOne(name, id, params);
                    return this.respond(item, null, request);
                } catch (error) {
                    return request.respond(404);
                }
            }
            if (request.method === 'PUT') {
                try {
                    const item = this.updateOne(name, id, request.json);
                    return this.respond(item, null, request);
                } catch (error) {
                    return request.respond(404);
                }
            }
            if (request.method === 'PATCH') {
                try {
                    const item = this.updateOne(name, id, request.json);
                    return this.respond(item, null, request);
                } catch (error) {
                    return request.respond(404);
                }
            }
            if (request.method === 'DELETE') {
                try {
                    const item = this.removeOne(name, id);
                    return this.respond(item, null, request);
                } catch (error) {
                    return request.respond(404);
                }
            }
        }
    }

    getHandler() {
        return this.handle.bind(this);
    }
}
