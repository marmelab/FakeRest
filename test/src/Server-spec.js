/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var Server = FakeRest.Server;
    var Collection = FakeRest.Collection;

    function getFakeXMLHTTPRequest(method, url, data) {
        var xhr = sinon.useFakeXMLHttpRequest();
        var request;
        xhr.onCreate = function (xhr) {
            request = xhr;
        };
        var myRequest = new XMLHttpRequest();
        myRequest.open(method, url, false);
        myRequest.send(data);
        xhr.restore();
        return request;
    }

    describe('Server', function() {

        describe('init', function() {
            it('should populate several collections', function() {
                var server = new Server();
                server.init({
                    foo: [{a:1}, {a:2}, {a:3}],
                    bar: [{b: true}, {b: false}]
                });
                expect(server.getAll('foo')).toEqual([{ id: 0, a:1 }, { id: 1, a:2 }, { id: 2, a:3 }]);
                expect(server.getAll('bar')).toEqual([{ id: 0, b: true }, { id: 1, b: false }]);
            });
        });

        describe('addCollection', function() {

            it('should add a collection and index it by name', function() {
                var server = new Server();
                var collection = new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                server.addCollection('foo', collection);
                collection = server.getCollection('foo');
                expect(collection).toEqual(collection);
            });
        });

        describe('getAll', function() {

            it('should return all items for a given name', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                server.addCollection('baz', new Collection([{id: 1, name: 'baz'}]));
                expect(server.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(server.getAll('baz')).toEqual([{id: 1, name: 'baz'}]);
            });

            it('should support a query', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([
                    {id: 0, name: 'c', arg: false },
                    {id: 1, name: 'b', arg: true },
                    {id: 2, name: 'a', arg: true}
                ]));
                var params = { filter: { 'arg': true }, sort: 'name', slice: [0,10] };
                var expected = [
                    {id: 2, name: 'a', arg: true},
                    {id: 1, name: 'b', arg: true }
                ];
                expect(server.getAll('foo', params)).toEqual(expected);
            });
        });

        describe('getOne', function() {

            it('should return an error when no collection match the identifier', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}]));
                expect(function() { server.getOne('foo', 2); }).toThrow(new Error('No item with identifier 2'));
            });

            it('should return the first collection matching the identifier', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                expect(server.getOne('foo', 1)).toEqual({id: 1, name: 'foo'});
                expect(server.getOne('foo', 2)).toEqual({id: 2, name: 'bar'});
            });

            it('should use the identifierName', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{_id: 1, name: 'foo'}, {_id: 2, name: 'bar'}], '_id'));
                expect(server.getOne('foo', 1)).toEqual({_id: 1, name: 'foo'});
                expect(server.getOne('foo', 2)).toEqual({_id: 2, name: 'bar'});
            });

        });

        describe('addRequestInterceptor', function() {
            it('should allow request transformation', function() {
                var server = new Server();
                server.addRequestInterceptor(function(request) {
                    var start = (request.params._start - 1) || 0;
                    var end = request.params._end !== undefined ? (request.params._end - 1) : 19;
                    request.params.range = [start, end];
                    return request;
                });
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request;
                request = getFakeXMLHTTPRequest('GET', '/foo?_start=1&_end=1');
                server.handle(request);
                expect(request.status).toEqual(206);
                expect(request.responseText).toEqual('[{"id":1,"name":"foo"}]');
                expect(request.getResponseHeader('Content-Range')).toEqual('items 0-0/2');
                request = getFakeXMLHTTPRequest('GET', '/foo?_start=2&_end=2');
                server.handle(request);
                expect(request.status).toEqual(206);
                expect(request.responseText).toEqual('[{"id":2,"name":"bar"}]');
                expect(request.getResponseHeader('Content-Range')).toEqual('items 1-1/2');
            });
        });

        describe('addResponseInterceptor', function() {
            it('should allow response transformation', function() {
                var server = new Server();
                server.addResponseInterceptor(function(response) {
                    response.body = { data: response.body, status: response.status };
                    return response;
                });
                server.addResponseInterceptor(function(response) {
                    response.status = 418;
                    return response;
                });
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request;
                request = getFakeXMLHTTPRequest('GET', '/foo');
                server.handle(request);
                expect(request.status).toEqual(418);
                expect(request.responseText).toEqual('{"data":[{"id":1,"name":"foo"},{"id":2,"name":"bar"}],"status":200}');
            });

            it('should pass request in response interceptor', function() {
                var server = new Server();
                var requestUrl;
                server.addResponseInterceptor(function(response, request) {
                    requestUrl = request.url;
                    return response;
                });
                server.addCollection('foo', new Collection());

                var request;
                request = getFakeXMLHTTPRequest('GET', '/foo');
                server.handle(request);

                expect(requestUrl).toEqual('/foo');
            });
        });

        describe('handle', function() {

            it('should not respond to GET /whatever on non existing collection', function() {
                var server = new Server();
                var request = getFakeXMLHTTPRequest('GET', '/foo');
                server.handle(request);
                expect(request.status).toEqual(0); // not responded
            });

            it('should respond to GET /foo by sending all items in collection foo', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('GET', '/foo');
                server.handle(request);
                expect(request.status).toEqual(200);
                expect(request.responseText).toEqual('[{"id":1,"name":"foo"},{"id":2,"name":"bar"}]');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(request.getResponseHeader('Content-Range')).toEqual('items 0-1/2');
            });

            it('should respond to GET /foo?queryString by sending all items in collection foo satisfying query', function() {
                var server = new Server();
                server.addCollection('foos', new Collection([
                    {id: 0, name: 'c', arg: false },
                    {id: 1, name: 'b', arg: true },
                    {id: 2, name: 'a', arg: true}
                ]));
                server.addCollection('bars', new Collection([
                    {id: 0, name: 'a', foo_id: 1 }
                ]));
                var request = getFakeXMLHTTPRequest('GET', '/foos?filter={"arg":true}&sort=name&slice=[0,10]&embed=["bars"]');
                server.handle(request);
                expect(request.status).toEqual(200);
                expect(request.responseText).toEqual('[{"id":2,"name":"a","arg":true,"bars":[]},{"id":1,"name":"b","arg":true,"bars":[{"id":0,"name":"a","foo_id":1}]}]');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(request.getResponseHeader('Content-Range')).toEqual('items 0-1/2');
            });

            it('should respond to GET /foo?queryString with pagination by sending the correct content-range header', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}])); // 11 items
                var request;
                request = getFakeXMLHTTPRequest('GET', '/foo');
                server.handle(request);
                expect(request.status).toEqual(200);
                expect(request.getResponseHeader('Content-Range')).toEqual('items 0-10/11');
                request = getFakeXMLHTTPRequest('GET', '/foo?range=[0,4]');
                server.handle(request);
                expect(request.status).toEqual(206);
                expect(request.getResponseHeader('Content-Range')).toEqual('items 0-4/11');
                request = getFakeXMLHTTPRequest('GET', '/foo?range=[5,9]');
                server.handle(request);
                expect(request.status).toEqual(206);
                expect(request.getResponseHeader('Content-Range')).toEqual('items 5-9/11');
                request = getFakeXMLHTTPRequest('GET', '/foo?range=[10,14]');
                server.handle(request);
                expect(request.status).toEqual(206);
                expect(request.getResponseHeader('Content-Range')).toEqual('items 10-10/11');
            });

            it('should respond to GET /foo on an empty collection with a []', function() {
                var server = new Server();
                server.addCollection('foo', new Collection());
                var request = getFakeXMLHTTPRequest('GET', '/foo');
                server.handle(request);
                expect(request.status).toEqual(200);
                expect(request.responseText).toEqual('[]');
                expect(request.getResponseHeader('Content-Range')).toEqual('items */0');
            });

            it('should respond to POST /foo by adding an item to collection foo', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('POST', '/foo', JSON.stringify({name: 'baz'}));
                server.handle(request);
                expect(request.status).toEqual(201);
                expect(request.responseText).toEqual('{"name":"baz","id":3}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(request.getResponseHeader('Location')).toEqual('/foo/3');
                expect(server.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}, {id: 3, name: 'baz'}]);
            });

            it('should respond to GET /foo/:id by sending element of identifier id in collection foo', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('GET', '/foo/2');
                server.handle(request);
                expect(request.status).toEqual(200);
                expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
            });

            it('should respond to GET /foo/:id on a non-existing id with a 404', function() {
                var server = new Server();
                server.addCollection('foo', new Collection());
                var request = getFakeXMLHTTPRequest('GET', '/foo/3');
                server.handle(request);
                expect(request.status).toEqual(404);
            });

            it('should respond to PUT /foo/:id by updating element of identifier id in collection foo', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('PUT', '/foo/2', JSON.stringify({name: 'baz'}));
                server.handle(request);
                expect(request.status).toEqual(200);
                expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(server.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'baz'}]);
            });

            it('should respond to PUT /foo/:id on a non-existing id with a 404', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([]));
                var request = getFakeXMLHTTPRequest('PUT', '/foo/3', JSON.stringify({name: 'baz'}));
                server.handle(request);
                expect(request.status).toEqual(404);
            });

            it('should respond to PATCH /foo/:id by updating element of identifier id in collection foo', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('PATCH', '/foo/2', JSON.stringify({name: 'baz'}));
                server.handle(request);
                expect(request.status).toEqual(200);
                expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(server.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'baz'}]);
            });

            it('should respond to PATCH /foo/:id on a non-existing id with a 404', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([]));
                var request = getFakeXMLHTTPRequest('PATCH', '/foo/3', JSON.stringify({name: 'baz'}));
                server.handle(request);
                expect(request.status).toEqual(404);
            });

            it('should respond to DELETE /foo/:id by removing element of identifier id in collection foo', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('DELETE', '/foo/2');
                server.handle(request);
                expect(request.status).toEqual(200);
                expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(server.getAll('foo')).toEqual([{id: 1, name: 'foo'}]);
            });

            it('should respond to DELETE /foo/:id on a non-existing id with a 404', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([]));
                var request = getFakeXMLHTTPRequest('DELETE', '/foo/3');
                server.handle(request);
                expect(request.status).toEqual(404);
            });

        });

        describe('setDefaultQuery', function() {
            it('should set the default query string', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}])); // 10 items
                server.setDefaultQuery(function() { return { range: [2,4] } })
                var request;
                request = getFakeXMLHTTPRequest('GET', '/foo');
                server.handle(request);
                expect(request.status).toEqual(206);
                expect(request.getResponseHeader('Content-Range')).toEqual('items 2-4/10');
                var expected = [{ id: 2 }, { id: 3 }, { id: 4}];
                expect(request.responseText).toEqual(JSON.stringify(expected));
            });

            it('should not override any provided query string', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}])); // 10 items
                server.setDefaultQuery(function(name) { return { range: [2,4] } })
                var request;
                request = getFakeXMLHTTPRequest('GET', '/foo?range=[0,4]');
                server.handle(request);
                expect(request.status).toEqual(206);
                expect(request.getResponseHeader('Content-Range')).toEqual('items 0-4/10');
                var expected = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4}];
                expect(request.responseText).toEqual(JSON.stringify(expected));
            });
        });

        describe('batch', function() {
            it('should return batch response', function() {
                var server = new Server();
                server.init({
                    foo: [{a:1}, {a:2}, {a:3}],
                    bar: [{b: true}, {b: false}]
                });
                server.setBatchUrl('/batch');
                var request = getFakeXMLHTTPRequest('POST', '/batch', JSON.stringify({foo0: '/foo/0', allbar: '/bar', baz0: '/baz/0'}));
                server.handle(request);
                expect(request.responseText).toEqual(JSON.stringify({
                    foo0: {
                        code: 200,
                        headers: [
                            {
                                name: 'Content-Type',
                                value: 'application/json'
                            }
                        ],
                        body: '{\"a\":1,\"id\":0}'
                    },
                    allbar: {
                        code: 200,
                        headers: [
                            { name: 'Content-Range', value: 'items 0-1/2' },
                            { name: 'Content-Type', value: 'application/json' }
                        ],
                        body: '[{\"b\":true,\"id\":0},{\"b\":false,\"id\":1}]'
                    },
                    baz0: {
                        code: 404,
                        headers: [],
                        body: {}
                    }
                }));
            });
        });

    });
})();
