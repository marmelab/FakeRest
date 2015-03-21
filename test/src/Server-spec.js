/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var Server = FakeRest.Server;
    var Collection = FakeRest.Collection;

    describe('Server', function() {

        describe('addCollection', function() {

            it('should add a collection and index it by name', function() {
                var server = new Server();
                var collection = new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}])
                server.addCollection('foo', collection);
                var collection = server.getCollection('foo');
                expect(collection).toEqual(collection);
            });            
        })

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

            it('should return undefined when no collection match the identifier', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}]));
                expect(server.getOne('foo', 2)).toBe(undefined);
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

        describe('handle', function() {

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

            it('should pass GET /foo to getAll(\'foo\')', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('GET', '/foo');
                server.handle(request)
                expect(request.responseText).toEqual('[{"id":1,"name":"foo"},{"id":2,"name":"bar"}]');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
            });

            it('should pass GET /foo?queryString to getAll(\'foo\', params)', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([
                    {id: 0, name: 'c', arg: false },
                    {id: 1, name: 'b', arg: true },
                    {id: 2, name: 'a', arg: true}
                ]));
                var request = getFakeXMLHTTPRequest('GET', '/foo?filter={"arg":true}&sort=name&slice=[0,10]');
                server.handle(request)
                expect(request.responseText).toEqual('[{"id":2,"name":"a","arg":true},{"id":1,"name":"b","arg":true}]');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
            });

            it('should pass POST /foo to addOne(\'foo\')', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('POST', '/foo', JSON.stringify({name: 'baz'}));
                server.handle(request)
                expect(request.responseText).toEqual('{"name":"baz","id":3}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(server.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}, {id: 3, name: 'baz'}]);
            });

            it('should pass GET /foo/:id to getOne(\'foo\', id)', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('GET', '/foo/2');
                server.handle(request)
                expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
            });

            it('should pass PUT /foo/:id to updateOne(\'foo\', id)', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('PUT', '/foo/2', JSON.stringify({name: 'baz'}));
                server.handle(request)
                expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(server.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'baz'}]);
            });

            it('should pass DELETE /foo/:id to removeOne(\'foo\', id)', function() {
                var server = new Server();
                server.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                var request = getFakeXMLHTTPRequest('DELETE', '/foo/2');
                server.handle(request)
                expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
                expect(request.getResponseHeader('Content-Type')).toEqual('application/json');
                expect(server.getAll('foo')).toEqual([{id: 1, name: 'foo'}]);
            });

        })

    });
})();
