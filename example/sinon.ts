import sinon from 'sinon';
import { SinonServer } from '../src/FakeRest';
import { data } from './data';
import { type DataProvider, HttpError } from 'react-admin';

export const initializeSinon = () => {
    const restServer = new SinonServer({
        baseUrl: 'http://localhost:3000',
        data,
        loggingEnabled: true,
    });

    restServer.addMiddleware((request, context, next) => {
        if (request.requestHeaders.Authorization === undefined) {
            request.respond(401, {}, 'Unauthorized');
            return null;
        }

        if (
            context.collection === 'books' &&
            request.method === 'POST' &&
            !context.requestJson?.title
        ) {
            request.respond(400, {}, 'Title is required');
            return null;
        }

        return next(request, context);
    });

    // use sinon.js to monkey-patch XmlHttpRequest
    const sinonServer = sinon.fakeServer.create();
    // this is required when doing asynchronous XmlHttpRequest
    sinonServer.autoRespond = true;
    if (window) {
        // @ts-ignore
        window.restServer = restServer; // give way to update data in the console
        // @ts-ignore
        window.sinonServer = sinonServer; // give way to update data in the console
    }
    sinonServer.respondWith(restServer.getHandler());
};

export const dataProvider: DataProvider = {
    async getList(resource, params) {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;

        const rangeStart = (page - 1) * perPage;
        const rangeEnd = page * perPage - 1;
        const query = {
            sort: JSON.stringify([field, order]),
            range: JSON.stringify([rangeStart, rangeEnd]),
            filter: JSON.stringify(params.filter),
        };
        const json = await sendRequest(
            `http://localhost:3000/${resource}?${new URLSearchParams(query)}`,
        );
        return {
            data: json.json,
            total: Number.parseInt(
                json.headers['Content-Range'].split('/').pop() ?? '0',
                10,
            ),
        };
    },
    async getMany(resource, params) {
        const query = {
            filter: JSON.stringify({ id: params.ids }),
        };
        const json = await sendRequest(
            `http://localhost:3000/${resource}?${new URLSearchParams(query)}`,
        );
        return {
            data: json.json,
        };
    },
    async getManyReference(resource, params) {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const rangeStart = (page - 1) * perPage;
        const rangeEnd = page * perPage - 1;
        const query = {
            sort: JSON.stringify([field, order]),
            range: JSON.stringify([rangeStart, rangeEnd]),
            filter: JSON.stringify({
                ...params.filter,
                [params.target]: params.id,
            }),
        };
        const json = await sendRequest(
            `http://localhost:3000/${resource}?${new URLSearchParams(query)}`,
        );
        return {
            data: json.json,
            total: Number.parseInt(
                json.headers['Content-Range'].split('/').pop() ?? '0',
                10,
            ),
        };
    },
    async getOne(resource, params) {
        const json = await sendRequest(
            `http://localhost:3000/${resource}/${params.id}`,
        );
        return {
            data: json.json,
        };
    },
    async create(resource, params) {
        const json = await sendRequest(
            `http://localhost:3000/${resource}`,
            'POST',
            JSON.stringify(params.data),
        );
        return {
            data: json.json,
        };
    },
    async update(resource, params) {
        const json = await sendRequest(
            `http://localhost:3000/${resource}/${params.id}`,
            'PUT',
            JSON.stringify(params.data),
        );
        return {
            data: json.json,
        };
    },
    async updateMany(resource, params) {
        return Promise.all(
            params.ids.map((id) =>
                this.update(resource, { id, data: params.data }),
            ),
        ).then((responses) => ({ data: responses.map(({ json }) => json.id) }));
    },
    async delete(resource, params) {
        const json = await sendRequest(
            `http://localhost:3000/${resource}/${params.id}`,
            'DELETE',
            null,
        );
        return {
            data: json.json,
        };
    },
    async deleteMany(resource, params) {
        return Promise.all(
            params.ids.map((id) => this.delete(resource, { id })),
        ).then((responses) => ({
            data: responses.map(({ data }) => data.id),
        }));
    },
};

const sendRequest = (
    url: string,
    method = 'GET',
    body: any = null,
): Promise<any> => {
    const request = new XMLHttpRequest();
    request.open(method, url);

    const persistedUser = localStorage.getItem('user');
    const user = persistedUser ? JSON.parse(persistedUser) : null;
    if (user) {
        request.setRequestHeader('Authorization', `Bearer ${user.id}`);
    }

    // add content-type header
    request.overrideMimeType('application/json');
    request.send(body);

    return new Promise((resolve, reject) => {
        request.onloadend = (e) => {
            let json: any;
            try {
                json = JSON.parse(request.responseText);
            } catch (e) {
                // not json, no big deal
            }
            // Get the raw header string
            const headers = request.getAllResponseHeaders();

            // Convert the header string into an array
            // of individual headers
            const arr = headers.trim().split(/[\r\n]+/);

            // Create a map of header names to values
            const headerMap: Record<string, string> = {};
            for (const line of arr) {
                const parts = line.split(': ');
                const header = parts.shift();
                if (!header) continue;
                const value = parts.join(': ');
                headerMap[header] = value;
            }
            if (request.status < 200 || request.status >= 300) {
                return reject(
                    new HttpError(
                        json?.message || request.statusText,
                        request.status,
                        json,
                    ),
                );
            }
            resolve({
                status: request.status,
                headers: headerMap,
                body: request.responseText,
                json,
            });
        };
    });
};
