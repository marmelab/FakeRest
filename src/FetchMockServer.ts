import { BaseServer, type BaseServerOptions } from './BaseServer.js';
import { parseQueryString } from './parseQueryString.js';
import type { MockResponse, MockResponseObject } from 'fetch-mock';

export class FetchMockServer extends BaseServer {
    requestInterceptors: FetchMockRequestInterceptor[] = [];
    responseInterceptors: FetchMockResponseInterceptor[] = [];

    decode(request: Request, opts?: RequestInit) {
        const req: FetchMockFakeRestRequest =
            typeof request === 'string' ? new Request(request, opts) : request;
        req.queryString = req.url
            ? decodeURIComponent(req.url.slice(req.url.indexOf('?') + 1))
            : '';
        req.params = parseQueryString(req.queryString);
        return (req as Request)
            .text()
            .then((text) => {
                req.requestBody = text;
                try {
                    req.requestJson = JSON.parse(text);
                } catch (e) {
                    // not JSON, no big deal
                }
            })
            .then(() =>
                this.requestInterceptors.reduce(
                    (previous, current) => current(previous),
                    req,
                ),
            );
    }

    respond(response: MockResponseObject, request: FetchMockFakeRestRequest) {
        const resp = this.responseInterceptors.reduce(
            (previous, current) => current(previous, request),
            response,
        );
        this.log(request, resp);

        return resp;
    }

    log(request: FetchMockFakeRestRequest, response: MockResponseObject) {
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
            console.log(
                'FakeRest request ',
                request.method,
                request.url,
                'headers',
                request.headers,
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

    batch(request: any) {
        throw new Error('not implemented');
    }

    /**
     * @param {Request} fetch request
     * @param {Object} options
     *
     */
    handle(req: Request, opts?: RequestInit) {
        return this.decode(req, opts).then((request) => {
            // handle batch request
            if (
                this.batchUrl &&
                this.batchUrl === request.url &&
                request.method === 'POST'
            ) {
                return this.batch(request);
            }

            const response = this.handleRequest({
                url: request.url,
                method: request.method,
                requestJson: request.requestJson,
                params: request.params,
            });

            return this.respond(response, request);
        });
    }

    getHandler() {
        return this.handle.bind(this);
    }
}

export const getFetchMockHandler = (options: BaseServerOptions) => {
    const server = new FetchMockServer(options);
    return server.getHandler();
};

/**
 * @deprecated Use FetchServer instead
 */
export const FetchServer = FetchMockServer;

export type FetchMockFakeRestRequest = Partial<Request> & {
    requestBody?: string;
    responseText?: string;
    requestJson?: Record<string, any>;
    queryString?: string;
    params?: { [key: string]: any };
};

export type FetchMockRequestInterceptor = (
    request: FetchMockFakeRestRequest,
) => FetchMockFakeRestRequest;

export type FetchMockResponseInterceptor = (
    response: MockResponseObject,
    request: FetchMockFakeRestRequest,
) => MockResponseObject;
