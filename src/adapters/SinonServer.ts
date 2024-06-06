import type { SinonFakeXMLHttpRequest } from 'sinon';
import {
    type BaseResponse,
    BaseServer,
    type BaseServerOptions,
} from '../BaseServer.js';
import { parseQueryString } from '../parseQueryString.js';

export class SinonServer extends BaseServer<
    SinonFakeXMLHttpRequest,
    SinonFakeRestResponse
> {
    loggingEnabled = false;

    constructor({
        loggingEnabled = false,
        ...options
    }: SinonServerOptions = {}) {
        super(options);
        this.loggingEnabled = loggingEnabled;
    }

    toggleLogging() {
        this.loggingEnabled = !this.loggingEnabled;
    }

    async getNormalizedRequest(request: SinonFakeXMLHttpRequest) {
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
            params,
            requestBody,
            method: req.method,
        };
    }

    async respond(response: BaseResponse, request: SinonFakeXMLHttpRequest) {
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

        return {
            status: response.status,
            body: response.body,
            headers: response.headers,
        };
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

    getHandler() {
        return (request: SinonFakeXMLHttpRequest) => {
            // This is an internal property of SinonFakeXMLHttpRequest but we have to set it to 4 to
            // suppress sinon's synchronous processing (which would result in HTTP 404). This allows us
            // to handle the request asynchronously.
            // See https://github.com/sinonjs/sinon/issues/637
            // @ts-expect-error
            request.readyState = 4;
            this.handle(request);
            // Let Sinon know we've handled the request
            return true;
        };
    }
}

export const getSinonHandler = (options: SinonServerOptions) => {
    const server = new SinonServer(options);
    return server.getHandler();
};

/**
 * @deprecated Use SinonServer instead
 */
export const Server = SinonServer;

export type SinonFakeRestResponse = {
    status: number;
    body: any;
    headers: Record<string, string>;
};

export type SinonServerOptions = BaseServerOptions & {
    loggingEnabled?: boolean;
};
