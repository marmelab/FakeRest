import { http, HttpResponse } from 'msw';
import { type BaseResponse, BaseServer } from '../BaseServer.js';
import type { DatabaseOptions } from '../Database.js';

export class MswServer extends BaseServer<Request, Response> {
    async respond(response: BaseResponse) {
        return HttpResponse.json(response.body, {
            status: response.status,
            headers: response.headers,
        });
    }

    async getNormalizedRequest(request: Request) {
        const url = new URL(request.url);
        const params = Object.fromEntries(
            Array.from(new URLSearchParams(url.search).entries()).map(
                ([key, value]) => [key, JSON.parse(value)],
            ),
        );
        let requestBody: Record<string, any> | undefined = undefined;
        try {
            const text = await request.text();
            requestBody = JSON.parse(text);
        } catch (e) {
            // not JSON, no big deal
        }

        return {
            url: request.url,
            params,
            requestBody,
            method: request.method,
        };
    }

    getHandler() {
        return http.all(
            // Using a regex ensures we match all URLs that start with the collection name
            new RegExp(`${this.baseUrl}`),
            ({ request }) => this.handle(request),
        );
    }
}

export const getMswHandler = (options: DatabaseOptions) => {
    const server = new MswServer(options);
    return server.getHandler();
};
