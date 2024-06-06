import sinon, { type SinonFakeXMLHttpRequest } from 'sinon';

import { SinonServer } from './SinonServer.js';
import { Single } from '../Single.js';
import { Collection } from '../Collection.js';
import type { BaseResponse } from '../AbstractBaseServer.js';

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
    describe('init', () => {
        it('should populate several collections', () => {
            const server = new SinonServer();
            server.init({
                foo: [{ a: 1 }, { a: 2 }, { a: 3 }],
                bar: [{ b: true }, { b: false }],
                baz: { name: 'baz' },
            });
            expect(server.getAll('foo')).toEqual([
                { id: 0, a: 1 },
                { id: 1, a: 2 },
                { id: 2, a: 3 },
            ]);
            expect(server.getAll('bar')).toEqual([
                { id: 0, b: true },
                { id: 1, b: false },
            ]);
            expect(server.getOnly('baz')).toEqual({ name: 'baz' });
        });
    });

    describe('addCollection', () => {
        it('should add a collection and index it by name', () => {
            const server = new SinonServer();
            const collection = new Collection({
                items: [
                    { id: 1, name: 'foo' },
                    { id: 2, name: 'bar' },
                ],
            });
            server.addCollection('foo', collection);
            const newcollection = server.getCollection('foo');
            expect(newcollection).toEqual(collection);
        });
    });

    describe('addSingle', () => {
        it('should add a single object and index it by name', () => {
            const server = new SinonServer();
            const single = new Single({ name: 'foo', description: 'bar' });
            server.addSingle('foo', single);
            expect(server.getSingle('foo')).toEqual(single);
        });
    });

    describe('getAll', () => {
        it('should return all items for a given name', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            server.addCollection(
                'baz',
                new Collection({ items: [{ id: 1, name: 'baz' }] }),
            );
            expect(server.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'bar' },
            ]);
            expect(server.getAll('baz')).toEqual([{ id: 1, name: 'baz' }]);
        });

        it('should support a query', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 0, name: 'c', arg: false },
                        { id: 1, name: 'b', arg: true },
                        { id: 2, name: 'a', arg: true },
                    ],
                }),
            );
            const params = {
                filter: { arg: true },
                sort: 'name',
                slice: [0, 10],
            };
            const expected = [
                { id: 2, name: 'a', arg: true },
                { id: 1, name: 'b', arg: true },
            ];
            expect(server.getAll('foo', params)).toEqual(expected);
        });
    });

    describe('getOne', () => {
        it('should return an error when no collection match the identifier', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({ items: [{ id: 1, name: 'foo' }] }),
            );
            expect(() => {
                server.getOne('foo', 2);
            }).toThrow(new Error('No item with identifier 2'));
        });

        it('should return the first collection matching the identifier', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            expect(server.getOne('foo', 1)).toEqual({ id: 1, name: 'foo' });
            expect(server.getOne('foo', 2)).toEqual({ id: 2, name: 'bar' });
        });

        it('should use the identifierName', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { _id: 1, name: 'foo' },
                        { _id: 2, name: 'bar' },
                    ],
                    identifierName: '_id',
                }),
            );
            expect(server.getOne('foo', 1)).toEqual({ _id: 1, name: 'foo' });
            expect(server.getOne('foo', 2)).toEqual({ _id: 2, name: 'bar' });
        });
    });

    describe('getOnly', () => {
        it('should return the single matching the identifier', () => {
            const server = new SinonServer();
            server.addSingle('foo', new Single({ name: 'foo' }));
            expect(server.getOnly('foo')).toEqual({ name: 'foo' });
        });
    });

    describe('addMiddleware', () => {
        it('should allow request transformation', () => {
            const server = new SinonServer();
            server.addMiddleware((request, context, next) => {
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
                return next(request, context);
            });
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            let request: SinonFakeXMLHttpRequest | null;
            request = getFakeXMLHTTPRequest('GET', '/foo?_start=1&_end=1');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request?.status).toEqual(206);
            // @ts-ignore
            expect(request.responseText).toEqual('[{"id":1,"name":"foo"}]');
            expect(request?.getResponseHeader('Content-Range')).toEqual(
                'items 0-0/2',
            );
            request = getFakeXMLHTTPRequest('GET', '/foo?_start=2&_end=2');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request?.status).toEqual(206);
            // @ts-ignore
            expect(request?.responseText).toEqual('[{"id":2,"name":"bar"}]');
            expect(request?.getResponseHeader('Content-Range')).toEqual(
                'items 1-1/2',
            );
        });

        it('should allow response transformation', () => {
            const server = new SinonServer();
            server.addMiddleware((request, context, next) => {
                const response = next(request, context);
                (response as BaseResponse).status = 418;
                return response;
            });
            server.addMiddleware((request, context, next) => {
                const response = next(request, context) as BaseResponse;
                response.body = {
                    data: response.body,
                    status: response.status,
                };
                return response;
            });
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(418);
            // @ts-ignore
            expect(request.responseText).toEqual(
                '{"data":[{"id":1,"name":"foo"},{"id":2,"name":"bar"}],"status":200}',
            );
        });

        it('should pass request in response interceptor', () => {
            const server = new SinonServer();
            let requestUrl: string | undefined;
            server.addMiddleware((request, context, next) => {
                requestUrl = request.url;
                return next(request, context);
            });
            server.addCollection('foo', new Collection());

            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);

            expect(requestUrl).toEqual('/foo');
        });
    });

    describe('handle', () => {
        it('should respond a 404 to GET /whatever on non existing collection', () => {
            const server = new SinonServer();
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(404); // not responded
        });

        it('should respond to GET /foo by sending all items in collection foo', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
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

        it('should respond to GET /foo?queryString by sending all items in collection foo satisfying query', () => {
            const server = new SinonServer();
            server.addCollection(
                'foos',
                new Collection({
                    items: [
                        { id: 0, name: 'c', arg: false },
                        { id: 1, name: 'b', arg: true },
                        { id: 2, name: 'a', arg: true },
                    ],
                }),
            );
            server.addCollection(
                'bars',
                new Collection({ items: [{ id: 0, name: 'a', foo_id: 1 }] }),
            );
            const request = getFakeXMLHTTPRequest(
                'GET',
                '/foos?filter={"arg":true}&sort=name&slice=[0,10]&embed=["bars"]',
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
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

        it('should respond to GET /foo?queryString with pagination by sending the correct content-range header', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
                }),
            ); // 11 items
            let request: SinonFakeXMLHttpRequest | null;
            request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 0-10/11',
            );
            request = getFakeXMLHTTPRequest('GET', '/foo?range=[0,4]');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 0-4/11',
            );
            request = getFakeXMLHTTPRequest('GET', '/foo?range=[5,9]');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 5-9/11',
            );
            request = getFakeXMLHTTPRequest('GET', '/foo?range=[10,14]');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 10-10/11',
            );
        });

        it('should respond to GET /foo on an empty collection with a []', () => {
            const server = new SinonServer();
            server.addCollection('foo', new Collection());
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('[]');
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items */0',
            );
        });

        it('should respond to POST /foo by adding an item to collection foo', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            const request = getFakeXMLHTTPRequest(
                'POST',
                '/foo',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(201);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"baz","id":3}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(request.getResponseHeader('Location')).toEqual('/foo/3');
            expect(server.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'bar' },
                { id: 3, name: 'baz' },
            ]);
        });

        it('should respond to POST /foo by adding an item to collection foo, even if the collection does not exist', () => {
            const server = new SinonServer();
            const request = getFakeXMLHTTPRequest(
                'POST',
                '/foo',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(201);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"baz","id":0}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(request.getResponseHeader('Location')).toEqual('/foo/0');
            expect(server.getAll('foo')).toEqual([{ id: 0, name: 'baz' }]);
        });

        it('should respond to GET /foo/:id by sending element of identifier id in collection foo', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            const request = getFakeXMLHTTPRequest('GET', '/foo/2');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
        });

        it('should respond to GET /foo/:id on a non-existing id with a 404', () => {
            const server = new SinonServer();
            server.addCollection('foo', new Collection());
            const request = getFakeXMLHTTPRequest('GET', '/foo/3');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(404);
        });

        it('should respond to PUT /foo/:id by updating element of identifier id in collection foo', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            const request = getFakeXMLHTTPRequest(
                'PUT',
                '/foo/2',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(server.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'baz' },
            ]);
        });

        it('should respond to PUT /foo/:id on a non-existing id with a 404', () => {
            const server = new SinonServer();
            server.addCollection('foo', new Collection({ items: [] }));
            const request = getFakeXMLHTTPRequest(
                'PUT',
                '/foo/3',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(404);
        });

        it('should respond to PATCH /foo/:id by updating element of identifier id in collection foo', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            const request = getFakeXMLHTTPRequest(
                'PATCH',
                '/foo/2',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(server.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'baz' },
            ]);
        });

        it('should respond to PATCH /foo/:id on a non-existing id with a 404', () => {
            const server = new SinonServer();
            server.addCollection('foo', new Collection({ items: [] }));
            const request = getFakeXMLHTTPRequest(
                'PATCH',
                '/foo/3',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(404);
        });

        it('should respond to DELETE /foo/:id by removing element of identifier id in collection foo', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            const request = getFakeXMLHTTPRequest('DELETE', '/foo/2');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(server.getAll('foo')).toEqual([{ id: 1, name: 'foo' }]);
        });

        it('should respond to DELETE /foo/:id on a non-existing id with a 404', () => {
            const server = new SinonServer();
            server.addCollection('foo', new Collection({ items: [] }));
            const request = getFakeXMLHTTPRequest('DELETE', '/foo/3');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(404);
        });

        it('should respond to GET /foo/ with single item', () => {
            const server = new SinonServer();
            server.addSingle('foo', new Single({ name: 'foo' }));

            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"foo"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
        });

        it('should respond to PUT /foo/ by updating the singleton record', () => {
            const server = new SinonServer();
            server.addSingle('foo', new Single({ name: 'foo' }));

            const request = getFakeXMLHTTPRequest(
                'PUT',
                '/foo/',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"baz"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(server.getOnly('foo')).toEqual({ name: 'baz' });
        });

        it('should respond to PATCH /foo/ by updating the singleton record', () => {
            const server = new SinonServer();
            server.addSingle('foo', new Single({ name: 'foo' }));

            const request = getFakeXMLHTTPRequest(
                'PATCH',
                '/foo/',
                JSON.stringify({ name: 'baz' }),
            );
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(200);
            // @ts-ignore
            expect(request.responseText).toEqual('{"name":"baz"}');
            expect(request.getResponseHeader('Content-Type')).toEqual(
                'application/json',
            );
            expect(server.getOnly('foo')).toEqual({ name: 'baz' });
        });
    });

    describe('setDefaultQuery', () => {
        it('should set the default query string', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
                }),
            ); // 10 items
            server.setDefaultQuery(() => {
                return { range: [2, 4] };
            });
            const request = getFakeXMLHTTPRequest('GET', '/foo');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
            expect(request.status).toEqual(206);
            expect(request.getResponseHeader('Content-Range')).toEqual(
                'items 2-4/10',
            );
            const expected = [{ id: 2 }, { id: 3 }, { id: 4 }];
            // @ts-ignore
            expect(request.responseText).toEqual(JSON.stringify(expected));
        });

        it('should not override any provided query string', () => {
            const server = new SinonServer();
            server.addCollection(
                'foo',
                new Collection({
                    items: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
                }),
            ); // 10 items
            server.setDefaultQuery((name) => ({ range: [2, 4] }));
            const request = getFakeXMLHTTPRequest('GET', '/foo?range=[0,4]');
            if (request == null) throw new Error('request is null');
            server.handleSync(request);
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