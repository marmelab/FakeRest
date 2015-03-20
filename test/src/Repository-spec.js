/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var repository;

    beforeEach(function() {
        repository = new FakeRest().repository;
    });
    
    describe('Repository', function() {

        describe('setResource', function() {
            it('should set resource by name', function() {
                repository.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                var inspect = repository.inspect();
                var resources = inspect[0];
                expect(resources).toEqual({'foo': [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]});
            });            
            it('should set identifier by name', function() {
                repository.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                var inspect = repository.inspect();
                var identifierNames = inspect[1];
                expect(identifierNames).toEqual({'foo': 'id'});
            });            
        })

        describe('getAll', function() {
            it('should throw an error for unknown resources', function() {
                expect(function() { repository.getAll('foo') }).toThrow(new Error('Unknown resource "foo"'));
            });

            it('should return all resources for a given name', function() {
                repository.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                repository.setResource('baz', [{id: 1, name: 'baz'}]);
                expect(repository.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(repository.getAll('baz')).toEqual([{id: 1, name: 'baz'}]);
            });
        });

        describe('getOne', function() {
            it('should throw an error for unknown resources', function() {
                expect(function() { repository.getOne('foo', 1) }).toThrow(new Error('Unknown resource "foo"'));
            });

            it('should return undefined when no resource match the identifier', function() {
                repository.setResource('foo', [{id: 1, name: 'foo'}]);
                expect(repository.getOne('foo', 2)).toBe(undefined);
            });

            it('should return the first resource matching the identifier', function() {
                repository.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(repository.getOne('foo', 1)).toEqual({id: 1, name: 'foo'});
                expect(repository.getOne('foo', 2)).toEqual({id: 2, name: 'bar'});
            });

            it('should use the identifierName', function() {
                repository.setResource('foo', [{_id: 1, name: 'foo'}, {_id: 2, name: 'bar'}], '_id');
                expect(repository.getOne('foo', 1)).toEqual({_id: 1, name: 'foo'});
                expect(repository.getOne('foo', 2)).toEqual({_id: 2, name: 'bar'});
            });

        });

    });
})();
