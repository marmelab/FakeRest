import { http, HttpResponse } from 'msw';
import { BaseServerWithMiddlewares } from './BaseServerWithMiddlewares.js';
import type {
    BaseRequest,
    BaseResponse,
    BaseServerOptions,
} from './BaseServer.js';

export class MswServer extends BaseServerWithMiddlewares<Request, Response> {
    async respond(response: BaseResponse) {
        return HttpResponse.json(response.body, {
            status: response.status,
            headers: response.headers,
        });
    }

    async extractContext(request: Request) {
        const url = new URL(request.url);
        const params = Object.fromEntries(
            Array.from(new URLSearchParams(url.search).entries()).map(
                ([key, value]) => [key, JSON.parse(value)],
            ),
        );
        let requestJson: Record<string, any> | undefined = undefined;
        try {
            const text = await request.text();
            requestJson = JSON.parse(text);
        } catch (e) {
            // not JSON, no big deal
        }

        const req: MswFakeRestRequest = request;
        req.requestJson = requestJson;
        req.params = params;

        return {
            url: request.url,
            params,
            requestJson,
            method: request.method,
        };
    }

    getHandlers() {
        return Object.keys(this.collections).map((collectionName) =>
            getCollectionHandlers({
                baseUrl: this.baseUrl,
                collectionName,
                server: this,
            }),
        );
    }
}

export const getMswHandlers = (options: BaseServerOptions) => {
    const server = new MswServer(options);
    return server.getHandlers();
};

const getCollectionHandlers = ({
    baseUrl,
    collectionName,
    server,
}: {
    baseUrl: string;
    collectionName: string;
    server: MswServer;
}) => {
    return http.all(
        // Using a regex ensures we match all URLs that start with the collection name
        new RegExp(`${baseUrl}/${collectionName}`),
        ({ request }) => server.handle(request),
    );
};

export type MswFakeRestRequest = Partial<Request> & BaseRequest;

export type MswRequestInterceptor = (
    request: MswFakeRestRequest,
) => MswFakeRestRequest;

export type MswResponseInterceptor = (
    response: HttpResponse,
    request: Request,
) => HttpResponse;
