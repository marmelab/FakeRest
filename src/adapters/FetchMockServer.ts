import type { MockResponseObject } from 'fetch-mock';
import {
    type BaseResponse,
    BaseServer,
    type FakeRestContext,
    type BaseServerOptions,
} from '../BaseServer.js';
import { parseQueryString } from '../parseQueryString.js';

export class FetchMockServer extends BaseServer<Request, MockResponseObject> {
    loggingEnabled = false;

    constructor({
        loggingEnabled = false,
        ...options
    }: FetchMockServerOptions = {}) {
        super(options);
        this.loggingEnabled = loggingEnabled;
    }

    toggleLogging() {
        this.loggingEnabled = !this.loggingEnabled;
    }

    async getNormalizedRequest(request: Request) {
        const req =
            typeof request === 'string' ? new Request(request) : request;
        const queryString = req.url
            ? decodeURIComponent(req.url.slice(req.url.indexOf('?') + 1))
            : '';
        const params = parseQueryString(queryString);
        const text = await req.text();
        let requestJson: Record<string, any> | undefined = undefined;
        try {
            requestJson = JSON.parse(text);
        } catch (e) {
            // not JSON, no big deal
        }

        return {
            url: req.url,
            params,
            requestJson,
            method: req.method,
        };
    }

    async respond(
        response: BaseResponse,
        request: FetchMockFakeRestRequest,
        context: FakeRestContext,
    ) {
        this.log(request, response, context);
        return response;
    }

    log(
        request: FetchMockFakeRestRequest,
        response: MockResponseObject,
        context: FakeRestContext,
    ) {
        if (!this.loggingEnabled) return;
        if (console.group) {
            // Better logging in Chrome
            console.groupCollapsed(context.method, context.url, '(FakeRest)');
            console.group('request');
            console.log(context.method, context.url);
            console.log('headers', request.headers);
            console.log('body   ', request.requestJson);
            console.groupEnd();
            console.group('response', response.status);
            console.log('headers', response.headers);
            console.log('body   ', response.body);
            console.groupEnd();
            console.groupEnd();
        } else {
            console.log(
                'FakeRest request ',
                context.method,
                context.url,
                'headers',
                request.headers,
                'body',
                request.requestJson,
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
        const handler = (url: string, options: RequestInit) => {
            return this.handle(new Request(url, options));
        };

        return handler;
    }
}

export const getFetchMockHandler = (options: FetchMockServerOptions) => {
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

export type FetchMockServerOptions = BaseServerOptions & {
    loggingEnabled?: boolean;
};
