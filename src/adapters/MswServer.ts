import { http, HttpResponse } from 'msw';
import { SimpleRestServer } from '../SimpleRestServer.js';
import type { BaseServerOptions } from '../SimpleRestServer.js';
import type { APIServer, NormalizedRequest } from '../types.js';

export class MswServer {
    server: APIServer;

    constructor({ server, ...options }: MswServerOptions) {
        this.server = server || new SimpleRestServer(options);
    }

    getHandler() {
        return http.all(
            // Using a regex ensures we match all URLs that start with the collection name
            new RegExp(`${this.server.baseUrl}`),
            async ({ request }) => {
                const normalizedRequest =
                    await this.getNormalizedRequest(request);
                const response = await this.server.handle(normalizedRequest);
                return HttpResponse.json(response.body, {
                    status: response.status,
                    headers: response.headers,
                });
            },
        );
    }

    async getNormalizedRequest(request: Request): Promise<NormalizedRequest> {
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
            headers: request.headers,
            params,
            requestBody,
            method: request.method,
        };
    }
}

export const getMswHandler = (options: MswServerOptions) => {
    const server = new MswServer(options);
    return server.getHandler();
};

export type MswServerOptions = BaseServerOptions & {
    server?: APIServer;
};
