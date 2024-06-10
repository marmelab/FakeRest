import type { SinonFakeXMLHttpRequest } from 'sinon';
import {
    SimpleRestServer,
    type BaseServerOptions,
} from '../SimpleRestServer.ts';
import { parseQueryString } from '../parseQueryString.ts';
import type { BaseResponse, APIServer, NormalizedRequest } from '../types.ts';

export class SinonAdapter {
    loggingEnabled = false;
    server: APIServer;

    constructor({
        loggingEnabled = false,
        server,
        ...options
    }: SinonAdapterOptions = {}) {
        this.server = server || new SimpleRestServer(options);
        this.loggingEnabled = loggingEnabled;
    }

    getHandler() {
        return async (request: SinonFakeXMLHttpRequest) => {
            // This is an internal property of SinonFakeXMLHttpRequest but we have to set it to 4 to
            // suppress sinon's synchronous processing (which would result in HTTP 404). This allows us
            // to handle the request asynchronously.
            // See https://github.com/sinonjs/sinon/issues/637
            // @ts-expect-error
            request.readyState = 4;
            const normalizedRequest = this.getNormalizedRequest(request);
            const response = await this.server.handle(normalizedRequest);
            this.respond(response, request);
        };
    }

    getNormalizedRequest(request: SinonFakeXMLHttpRequest): NormalizedRequest {
        const req: Request | SinonFakeXMLHttpRequest =
            typeof request === 'string' ? new Request(request) : request;

        const queryString = req.url
            ? decodeURIComponent(req.url.slice(req.url.indexOf('?') + 1))
            : '';
        const params = parseQueryString(queryString);
        let requestBody: Record<string, any> | undefined = undefined;
        if ((req as SinonFakeXMLHttpRequest).requestBody) {
            try {
                requestBody = JSON.parse(
                    (req as SinonFakeXMLHttpRequest).requestBody,
                );
            } catch (error) {
                // body isn't JSON, skipping
            }
        }

        return {
            url: req.url,
            headers: new Headers(request.requestHeaders),
            params,
            requestBody,
            method: req.method,
        };
    }

    respond(response: BaseResponse, request: SinonFakeXMLHttpRequest) {
        const sinonResponse = {
            status: response.status,
            body: response.body ?? '',
            headers: response.headers ?? {},
        };

        if (Array.isArray(sinonResponse.headers)) {
            if (
                !(
                    sinonResponse.headers as Array<{
                        name: string;
                        value: string;
                    }>
                ).find((header) => header.name.toLowerCase() === 'content-type')
            ) {
                sinonResponse.headers.push({
                    name: 'Content-Type',
                    value: 'application/json',
                });
            }
        } else if (
            !(sinonResponse.headers as Record<string, unknown>)['Content-Type']
        ) {
            sinonResponse.headers['Content-Type'] = 'application/json';
        }

        // This is an internal property of SinonFakeXMLHttpRequest but we have to reset it to 1
        // to handle the request asynchronously.
        // See https://github.com/sinonjs/sinon/issues/637
        // @ts-expect-error
        request.readyState = 1;

        request.respond(
            sinonResponse.status,
            sinonResponse.headers,
            JSON.stringify(sinonResponse.body),
        );

        this.log(request, sinonResponse);
    }

    log(request: SinonFakeXMLHttpRequest, response: SinonFakeRestResponse) {
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

    toggleLogging() {
        this.loggingEnabled = !this.loggingEnabled;
    }
}

export const getSinonHandler = (options: SinonAdapterOptions) => {
    const server = new SinonAdapter(options);
    return server.getHandler();
};

/**
 * @deprecated Use SinonServer instead
 */
export const Server = SinonAdapter;

export type SinonFakeRestResponse = {
    status: number;
    body: any;
    headers: Record<string, string>;
};

export type SinonAdapterOptions = BaseServerOptions & {
    server?: APIServer;
    loggingEnabled?: boolean;
};
