import type { SinonFakeXMLHttpRequest } from 'sinon';
import { BaseServer } from './BaseServer.js';
import { parseQueryString } from './parseQueryString.js';

export class Server extends BaseServer {
    requestInterceptors: SinonRequestInterceptor[] = [];
    responseInterceptors: SinonResponseInterceptor[] = [];

    constructor(baseUrl = '') {
        super(baseUrl);
    }

    addRequestInterceptor(interceptor: SinonRequestInterceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor: SinonResponseInterceptor) {
        this.responseInterceptors.push(interceptor);
    }

    decode(
        request: string | Request | SinonFakeRestRequest,
        opts?: RequestInit,
    ): SinonFakeRestRequest | Promise<SinonFakeRestRequest> {
        const req: SinonFakeRestRequest =
            typeof request === 'string' ? new Request(request, opts) : request;
        req.queryString = req.url
            ? decodeURIComponent(req.url.slice(req.url.indexOf('?') + 1))
            : '';
        req.params = parseQueryString(req.queryString);
        if (req.requestBody) {
            try {
                req.requestJson = JSON.parse(req.requestBody);
            } catch (error) {
                // body isn't JSON, skipping
            }
        }
        return this.requestInterceptors.reduce(
            (previous, current) => current(previous),
            req,
        );
    }

    respond(
        body: any,
        headers: Record<string, string> | null,
        request: SinonFakeRestRequest,
        status = 200,
    ) {
        let resp: SinonFakeRestResponse = {
            status,
            headers: headers || {},
            body,
        };
        if (resp.headers == null) {
            resp.headers = {};
        }
        if (Array.isArray(resp.headers)) {
            if (
                !(resp.headers as Array<{ name: string; value: string }>).find(
                    (header) => header.name.toLowerCase() === 'content-type',
                )
            ) {
                resp.headers.push({
                    name: 'Content-Type',
                    value: 'application/json',
                });
            }
        } else if (!(resp.headers as Record<string, unknown>)['Content-Type']) {
            resp.headers['Content-Type'] = 'application/json';
        }

        resp = this.responseInterceptors.reduce(
            (previous, current) => current(previous, request),
            resp,
        );
        this.log(request, resp);

        if (request.respond == null) {
            throw new Error('request.respond is null');
        }
        return request.respond(
            resp.status as number,
            resp.headers,
            JSON.stringify(resp.body),
        );
    }

    log(request: SinonFakeRestRequest, response: SinonFakeRestResponse) {
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

    batch(request: SinonFakeRestRequest) {
        const json = request.requestJson;
        const handle = this.handle.bind(this);

        if (json == null) {
            throw new Error('json is null');
        }

        const jsonResponse = Object.keys(json).reduce(
            (jsonResponse, requestName) => {
                let subResponse: Record<string, unknown> | undefined =
                    undefined;
                const sub: SinonFakeRestRequest = {
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
            {} as Record<string, Record<string, unknown>>,
        );

        return this.respond(jsonResponse, null, request);
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
    handle(request: Request | SinonFakeRestRequest | string) {
        const req = this.decode(request) as SinonFakeRestRequest;

        if (
            this.batchUrl &&
            this.batchUrl === req.url &&
            req.method === 'POST'
        ) {
            return this.batch(req);
        }

        const response = this.handleRequest({
            url: req.url,
            method: req.method,
            requestJson: req.requestJson,
            params: req.params,
        });

        return this.respond(
            response.body,
            response.headers,
            req,
            response.status,
        );
    }

    getHandler() {
        return this.handle.bind(this);
    }
}

export type SinonFakeRestRequest = Partial<SinonFakeXMLHttpRequest> & {
    requestBody?: string;
    responseText?: string;
    requestJson?: Record<string, any>;
    queryString?: string;
    params?: { [key: string]: any };
};

export type SinonFakeRestResponse = {
    status: number;
    body: any;
    headers: Record<string, string>;
};

export type SinonRequestInterceptor = (
    request: SinonFakeRestRequest,
) => SinonFakeRestRequest;

export type SinonResponseInterceptor = (
    response: SinonFakeRestResponse,
    request: SinonFakeRestRequest,
) => SinonFakeRestResponse;
