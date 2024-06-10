import sinon, { type SinonFakeXMLHttpRequest } from 'sinon';

import { SinonAdapter } from './SinonAdapter.ts';
import type { BaseResponse } from '../types.ts';

function getFakeXMLHTTPRequest(
    method: string,
    url: string,
    data?: any,
): SinonFakeXMLHttpRequest | null {
    const xhr = sinon.useFakeXMLHttpRequest();
    let request: SinonFakeXMLHttpRequest | null = null;
    xhr.onCreate = (xhr) => {
        request = xhr;
    };
    const myRequest = new XMLHttpRequest();
    myRequest.open(method, url, false);
    myRequest.send(data);
    xhr.restore();
    return request;
}

describe('SinonServer', () => {
    describe('addMiddleware', () => {
        it('should allow request transformation', async () => {
            const server = new SinonAdapter({
                data: {
                    foo: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                },
                middlewares: [
                    (context, next) => {
                        const start = context.params?._start
                            ? context.params._start - 1
                            : 0;
                        const end =
                            context.params?._end !== undefined
                                ? context.params._end - 1
                                : 19;
                        if (!context.params) {
                            context.params = {};
                        }
                        context.params.range = [start, end];
                        return next(context);
                    },
                ],
            });
            const handle = server.getHandler();
            let request: SinonFakeXMLHttpRequest | null;
            request = getFakeXMLHTTPRequest('GET', '/foo?_start=1&_end=1');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request?.status).toEqual(206);
            // @ts-ignore
            expect(request.responseText).toEqual('[{"id":1,"name":"foo"}]');
            expect(request?.getResponseHeader('Content-Range')).toEqual(
                'items 0-0/2',
            );
            request = getFakeXMLHTTPRequest('GET', '/foo?_start=2&_end=2');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request?.status).toEqual(206);
            // @ts-ignore
            expect(request?.responseText).toEqual('[{"id":2,"name":"bar"}]');
            expect(request?.getResponseHeader('Content-Range')).toEqual(
                'items 1-1/2',
            );
        });

        it('should allow response transformation', async () => {
            const server = new SinonAdapter({
                data: {
                    foo: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                },
                middlewares: [
                    (context, next) => {
                        const response = next(context);
                        (response as BaseResponse).status = 418;
                        return response;
                    },
                    (context, next) => {
                        const response = next(context) as BaseResponse;
                        response.body = {
                            data: response.body,
                            status: response.status,
                        };
                        return response;
                    },
                ],
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(418);
            // @ts-ignore
            expect(request.responseText).toEqual(
                '{"data":[{"id":1,"name":"foo"},{"id":2,"name":"bar"}],"status":200}',
            );
        });
    });

    describe('handle', () => {
        it('should respond a 404 to GET /whatever on non existing collection', async () => {
            const server = new SinonAdapter();
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(404); // not responded
        });

        it('should respond to GET /foo by sending all items in collection foo', async () => {
            const server = new SinonAdapter({
                data: {
                    foo: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual(
                '[{"id":1,"name":"foo"},{"id":2,"name":"bar"}]',
            );
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 0-1/2',
            );
        });

        it('should respond to GET /foo?queryString by sending all items in collection foo satisfying query', async () => {
            const server = new SinonAdapter({
                data: {
                    foos: [
                        { id: 0, name: 'c', arg: false },
                        { id: 1, name: 'b', arg: true },
                        { id: 2, name: 'a', arg: true },
                    ],
                    bars: [{ id: 0, name: 'a', foo_id: 1 }],
                },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'GET',
                '/foos?filter={"arg":true}&sort=name&slice=[0,10]&embed=["bars"]',
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual(
                '[{"id":2,"name":"a","arg":true,"bars":[]},{"id":1,"name":"b","arg":true,"bars":[{"id":0,"name":"a","foo_id":1}]}]',
            );
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 0-1/2',
            );
        });

        it('should respond to GET /foo?queryString with pagination by sending the correct content-range header', async () => {
            const server = new SinonAdapter({
                data: { foo: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}] }, // 11 items
            });
            const handle = server.getHandler();
            let request: SinonFakeXMLHttpRequest | null;
            request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 0-10/11',
            );
            request = getFakeXMLHTTPRequest('GET', '/foo?range=[0,4]');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 0-4/11',
            );
            request = getFakeXMLHTTPRequest('GET', '/foo?range=[5,9]');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 5-9/11',
            );
            request = getFakeXMLHTTPRequest('GET', '/foo?range=[10,14]');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 10-10/11',
            );
        });

        it('should respond to GET /foo on an empty collection with a []', async () => {
            const server = new SinonAdapter({
                data: { foo: [] },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('[]');
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items */0',
            );
        });

        it('should respond to POST /foo by adding an item to collection foo', async () => {
            const server = new SinonAdapter({
                data: {
                    foo: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'POST',
                '/foo',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(201);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"baz","id":3}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(request.getResponseHeader('Location')).toEqual('/foo/3');
            // @ts-ignore
            expect(server.server.database.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'bar' },
                { id: 3, name: 'baz' },
            ]);
        });

        it('should respond to POST /foo by adding an item to collection foo, even if the collection does not exist', async () => {
            const server = new SinonAdapter();
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'POST',
                '/foo',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(201);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"baz","id":0}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(request.getResponseHeader('Location')).toEqual('/foo/0');
            // @ts-ignore
            expect(server.server.database.getAll('foo')).toEqual([
                { id: 0, name: 'baz' },
            ]);
        });

        it('should respond to GET /foo/:id by sending element of identifier id in collection foo', async () => {
            const server = new SinonAdapter({
                data: {
                    foo: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo/2');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
        });

        it('should respond to GET /foo/:id on a non-existing id with a 404', async () => {
            const server = new SinonAdapter({ data: { foo: [] } });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo/3');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(404);
        });

        it('should respond to PUT /foo/:id by updating element of identifier id in collection foo', async () => {
            const server = new SinonAdapter({
                data: {
                    foo: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'PUT',
                '/foo/2',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            // @ts-ignore
            expect(server.server.database.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'baz' },
            ]);
        });

        it('should respond to PUT /foo/:id on a non-existing id with a 404', async () => {
            const server = new SinonAdapter();
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'PUT',
                '/foo/3',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(404);
        });

        it('should respond to PATCH /foo/:id by updating element of identifier id in collection foo', async () => {
            const server = new SinonAdapter({
                data: {
                    foo: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'PATCH',
                '/foo/2',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            // @ts-ignore
            expect(server.server.database.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'baz' },
            ]);
        });

        it('should respond to PATCH /foo/:id on a non-existing id with a 404', async () => {
            const server = new SinonAdapter({ data: { foo: [] } });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'PATCH',
                '/foo/3',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(404);
        });

        it('should respond to DELETE /foo/:id by removing element of identifier id in collection foo', async () => {
            const server = new SinonAdapter({
                data: {
                    foo: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('DELETE', '/foo/2');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            // @ts-ignore
            expect(server.server.database.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
            ]);
        });

        it('should respond to DELETE /foo/:id on a non-existing id with a 404', async () => {
            const server = new SinonAdapter({ data: { foo: [] } });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('DELETE', '/foo/3');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(404);
        });

        it('should respond to GET /foo/ with single item', async () => {
            const server = new SinonAdapter({
                data: { foo: { name: 'foo' } },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"foo"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
        });

        it('should respond to PUT /foo/ by updating the singleton record', async () => {
            const server = new SinonAdapter({
                data: { foo: { name: 'foo' } },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'PUT',
                '/foo/',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"baz"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            // @ts-ignore
            expect(server.server.database.getOnly('foo')).toEqual({
                name: 'baz',
            });
        });

        it('should respond to PATCH /foo/ by updating the singleton record', async () => {
            const server = new SinonAdapter({
                data: { foo: { name: 'foo' } },
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest(
                'PATCH',
                '/foo/',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"baz"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            // @ts-ignore
            expect(server.server.database.getOnly('foo')).toEqual({
                name: 'baz',
            });
        });
    });

    describe('setDefaultQuery', () => {
        it('should set the default query string', async () => {
            const server = new SinonAdapter({
                data: { foo: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}] }, // 10 items
                defaultQuery: () => ({ range: [2, 4] }),
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 2-4/10',
            );
            const expected = [{ id: 2 }, { id: 3 }, { id: 4 }];
            // @ts-ignore
            expect(request.responseText).toEqual(JSON.stringify(expected));
        });

        it('should not override any provided query string', async () => {
            const server = new SinonAdapter({
                data: { foo: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}] }, // 10 items
                defaultQuery: () => ({ range: [2, 4] }),
            });
            const handle = server.getHandler();
            const request = getFakeXMLHTTPRequest('GET', '/foo?range=[0,4]');
            if (request == null) throw new Error('request is null');
            await handle(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 0-4/10',
            );
            const expected = [
                { id: 0 },
                { id: 1 },
                { id: 2 },
                { id: 3 },
                { id: 4 },
            ];
            // @ts-ignore
            expect(request.responseText).toEqual(JSON.stringify(expected));
        });
    });
});
