import { SimpleRestServer } from '../SimpleRestServer.ts';
import type { BaseServerOptions } from '../SimpleRestServer.ts';
import type { APIServer, NormalizedRequest } from '../types.ts';

export class MswAdapter {
    server: APIServer;

    constructor({ server, ...options }: MswAdapterOptions) {
        this.server = server || new SimpleRestServer(options);
    }

    getHandler() {
        return async ({ request }: { request: Request }) => {
            const normalizedRequest = await this.getNormalizedRequest(request);
            const response = await this.server.handle(normalizedRequest);
            return new Response(JSON.stringify(response.body), {
                status: response.status,
                headers: response.headers,
            });
        };
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

export const getMswHandler = (options: MswAdapterOptions) => {
    const server = new MswAdapter(options);
    return server.getHandler();
};

export type MswAdapterOptions = BaseServerOptions & {
    server?: APIServer;
};
