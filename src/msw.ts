import { http, HttpResponse } from 'msw';
import type { CollectionItem } from './types.js';
import { BaseServer } from './BaseServer.js';

export const getMswHandlers = ({
    baseUrl = 'http://localhost:3000',
    data,
    getNewId,
}: {
    baseUrl?: string;
    data: Record<string, CollectionItem[] | CollectionItem>;
    getNewId?: () => number | string;
}) => {
    const server = new BaseServer({ baseUrl, getNewId });
    server.init(data);

    const collections = Object.keys(data);
    return collections.map((collectionName) =>
        getCollectionHandlers({ baseUrl, collectionName, server }),
    );
};

const getCollectionHandlers = ({
    baseUrl,
    collectionName,
    server,
}: {
    baseUrl: string;
    collectionName: string;
    server: BaseServer;
}) => {
    return http.all(
        // Using a regex ensures we match all URLs that start with the collection name
        new RegExp(`${baseUrl}/${collectionName}`),
        async ({ request }) => {
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
            const response = server.handleRequest({
                url: request.url.split('?')[0],
                method: request.method,
                requestJson,
                params,
            });

            return HttpResponse.json(response.body, {
                status: response.status,
                headers: response.headers,
            });
        },
    );
};
