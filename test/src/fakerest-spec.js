/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var httpBackend,
        http,
        resource,
        q;

    describe('fakerest', function() {

        describe('setResource', function() {
            it('should set resource by name', function() {
                var fakerest = new FakeRest();
                fakerest.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                var inspect = fakerest.inspect();
                var resources = inspect[0];
                expect(resources).toEqual({'foo': [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]});
            });            
            it('should set identifier by name', function() {
                var fakerest = new FakeRest();
                fakerest.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                var inspect = fakerest.inspect();
                var identifierNames = inspect[1];
                expect(identifierNames).toEqual({'foo': 'id'});
            });            
        })

        describe('getAll', function() {
            it('should throw an error for unknown resources', function() {
                var fakerest = new FakeRest();
                expect(function() { fakerest.getAll('foo') }).toThrow(new Error('Unknown resource "foo"'));
            });

            it('should return all resources for a given name', function() {
                var fakerest = new FakeRest();
                fakerest.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                fakerest.setResource('baz', [{id: 1, name: 'baz'}]);
                expect(fakerest.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(fakerest.getAll('baz')).toEqual([{id: 1, name: 'baz'}]);
            });
        });

        describe('getOne', function() {
            it('should throw an error for unknown resources', function() {
                var fakerest = new FakeRest();
                expect(function() { fakerest.getOne('foo', 1) }).toThrow(new Error('Unknown resource "foo"'));
            });

            it('should return undefined when no resource match the identifier', function() {
                var fakerest = new FakeRest();
                fakerest.setResource('foo', [{id: 1, name: 'foo'}]);
                expect(fakerest.getOne('foo', 2)).toBe(undefined);
            });

            it('should return the first resource matching the identifier', function() {
                var fakerest = new FakeRest();
                fakerest.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(fakerest.getOne('foo', 1)).toEqual({id: 1, name: 'foo'});
                expect(fakerest.getOne('foo', 2)).toEqual({id: 2, name: 'bar'});
            });

            it('should use the identifierName', function() {
                var fakerest = new FakeRest();
                fakerest.setResource('foo', [{_id: 1, name: 'foo'}, {_id: 2, name: 'bar'}], '_id');
                expect(fakerest.getOne('foo', 1)).toEqual({_id: 1, name: 'foo'});
                expect(fakerest.getOne('foo', 2)).toEqual({_id: 2, name: 'bar'});
            });

        });

    });
})();
