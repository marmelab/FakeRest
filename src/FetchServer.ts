import { Server } from './Server';
import { parseQueryString } from './parseQueryString';

export class FetchServer extends Server {
    decode(request: any, opts?: any): any {
        const req = (typeof request === 'string') ? new Request(request, opts) : request;
        req.queryString = decodeURIComponent(req.url.slice(req.url.indexOf('?') + 1));
        req.params = parseQueryString(req.queryString);
        return req.text()
            .then((text: string) => {
                req.requestBody = text
                try {
                    req.requestJson = JSON.parse(text)
                } catch(e) {
                    // not JSON, no big deal
                }
            })
            .then(() => this.requestInterceptors.reduce((previous: any, current: any) => current(previous), req))
    }

    respond(response: any, request: any): any {
        response = this.responseInterceptors.reduce(function(previous: any, current: any) {
            return current(previous, request);
        }, response);
        this.log(request, response);
        response.headers = new Headers(response.headers)

        return response;
    }

    log(request: any, response: any): void {
        if (!this.loggingEnabled) return;
        if (console.group) {
            // Better logging in Chrome
            console.groupCollapsed(request.method, request.url, '(FakeRest)');
            console.group('request');
            console.log(request.method, request.url);
            console.log('headers', request.headers);
            console.log('body   ', request.requestBody);
            console.groupEnd();
            console.group('response', response.status);
            console.log('headers', response.headers);
            console.log('body   ', response.body);
            console.groupEnd();
            console.groupEnd();
        } else {
            console.log('FakeRest request ', request.method, request.url, 'headers', request.headers, 'body', request.requestBody);
            console.log('FakeRest response', response.status, 'headers', response.headers, 'body', response.body);
        }
    }

    batch(request: any): void {
        throw new Error('not implemented');
    }

    /**
     * @param {Request} fetch request
     * @param {Object} options
     *
     */
    handle(req: any, opts?: any): any{
        return this.decode(req, opts)
            .then((request: any) => {
                const response: Record<string, unknown> = {
                    headers: {'Content-Type': 'application/json' },
                    status: 200,
                };

                // handle batch request
                if (this.batchUrl && this.batchUrl === request.url && request.method === 'POST') {
                    return this.batch(request);
                }

                // Handle Single Objects
                for (let name of this.getSingleNames()) {
                    let matches = request.url.match(new RegExp('^' + this.baseUrl + '\\/(' + name + ')(\\/?.*)?$' ));
                    if (!matches) continue;

                    if (request.method == 'GET') {
                        try {
                            response.body = this.getOnly(name);
                        } catch (error) {
                            response.status = 404;
                        }
                        return this.respond(response, request);
                    }
                    if (request.method == 'PUT') {
                        try {
                            response.body = this.updateOnly(name, request.requestJson);
                        } catch (error) {
                            response.status = 404;
                        }
                        return this.respond(response, request);
                    }
                    if (request.method == 'PATCH') {
                       try {
                            response.body = this.updateOnly(name, request.requestJson);
                        } catch (error) {
                            response.status = 404;
                        }
                        return this.respond(response, request);
                    }
                }

                // handle collections
                for (let name of this.getCollectionNames()) {
                    let matches = request.url.match(new RegExp('^' + this.baseUrl + '\\/(' + name + ')(\\/(\\d+))?(\\?.*)?$' ));
                    if (!matches) continue;
                    let params = Object.assign({}, this.defaultQuery(name), request.params);
                    if (!matches[2]) {
                        if (request.method == 'GET') {
                            let count = this.getCount(name, params.filter ? { filter: params.filter } : {});
                            if (count > 0) {
                                let items = this.getAll(name, params);
                                let first = params.range ? params.range[0] : 0;
                                let last = params.range ? Math.min(items.length - 1 + first, params.range[1]) : (items.length - 1);
                                response.body = items;
                                (response.headers as Record<string, unknown>)['Content-Range'] = `items ${first}-${last}/${count}`;
                                response.status = (items.length == count) ? 200 : 206;
                            } else {
                                response.body = [];
                                (response.headers as Record<string, unknown>)['Content-Range'] = 'items */0';
                            }
                            return this.respond(response, request);
                        }
                        if (request.method == 'POST') {
                            let newResource = this.addOne(name, request.requestJson);
                            let newResourceURI = this.baseUrl + '/' + name + '/' + newResource[this.getCollection(name).identifierName];
                            response.body = newResource;
                            (response.headers as Record<string, unknown>)['Location'] = newResourceURI;
                            response.status = 201;
                            return this.respond(response, request);
                        }
                    } else {
                        let id = matches[3];
                        if (request.method == 'GET') {
                            try {
                                response.body = this.getOne(name, id, params);
                            } catch (error) {
                                response.status = 404;
                            }
                            return this.respond(response, request);
                        }
                        if (request.method == 'PUT') {
                            try {
                                response.body = this.updateOne(name, id, request.requestJson);
                            } catch (error) {
                                response.status = 404;
                            }
                            return this.respond(response, request);
                        }
                        if (request.method == 'PATCH') {
                            try {
                                response.body = this.updateOne(name, id, request.requestJson);
                            } catch (error) {
                                response.status = 404;
                            }
                            return this.respond(response, request);
                        }
                        if (request.method == 'DELETE') {
                            try {
                                response.body = this.removeOne(name, id);
                            } catch (error) {
                                response.status = 404;
                            }
                            return this.respond(response, request);
                        }
                    }
                }
                return this.respond(response, request);
            });
    }
}
