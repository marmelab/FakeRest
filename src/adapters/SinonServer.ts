import type { SinonFakeXMLHttpRequest } from 'sinon';
import { BaseServer } from '../BaseServer.js';
import { parseQueryString } from '../parseQueryString.js';
import type { BaseResponse, BaseServerOptions } from '../AbstractBaseServer.js';

export class SinonServer extends BaseServer<
    SinonFakeXMLHttpRequest,
    SinonFakeRestResponse
> {
    extractContextSync(request: SinonFakeXMLHttpRequest) {
        const req: Request | SinonFakeXMLHttpRequest =
            typeof request === 'string' ? new Request(request) : request;

        const queryString = req.url
            ? decodeURIComponent(req.url.slice(req.url.indexOf('?') + 1))
            : '';
        const params = parseQueryString(queryString);
        let requestJson: Record<string, any> | undefined = undefined;
        if ((req as SinonFakeXMLHttpRequest).requestBody) {
            try {
                requestJson = JSON.parse(
                    (req as SinonFakeXMLHttpRequest).requestBody,
                );
            } catch (error) {
                // body isn't JSON, skipping
            }
        }

        return {
            url: req.url,
            params,
            requestJson,
            method: req.method,
        };
    }

    respondSync(response: BaseResponse, request: SinonFakeXMLHttpRequest) {
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
        // to allow the request to be resolved by Sinon.
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
            const result = this.handleSync(request);
            return result;
        };
    }
}

export const getSinonHandler = (options: BaseServerOptions) => {
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
