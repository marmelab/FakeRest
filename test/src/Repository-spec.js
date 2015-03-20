/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var Repository = FakeRest.getClass('Repository');
    var Resource = FakeRest.getClass('Resource');

    describe('Repository', function() {

        describe('addResource', function() {
            it('should add a resource and index it by name', function() {
                var repository = new Repository();
                var resource = new Resource([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}])
                repository.addResource('foo', resource);
                var resource = repository.getResource('foo');
                expect(resource).toEqual(resource);
            });            
        })

        describe('getAll', function() {
            it('should throw an error for unknown resources', function() {
                var repository = new Repository();
                expect(function() { repository.getAll('foo') }).toThrow(new Error('Unknown resource "foo"'));
            });

            it('should return all resources for a given name', function() {
                var repository = new Repository();
                repository.addResource('foo', new Resource([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                repository.addResource('baz', new Resource([{id: 1, name: 'baz'}]));
                expect(repository.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(repository.getAll('baz')).toEqual([{id: 1, name: 'baz'}]);
            });
        });

        describe('getOne', function() {
            it('should throw an error for unknown resources', function() {
                var repository = new Repository();
                expect(function() { repository.getOne('foo', 1) }).toThrow(new Error('Unknown resource "foo"'));
            });

            it('should return undefined when no resource match the identifier', function() {
                var repository = new Repository();
                repository.addResource('foo', new Resource([{id: 1, name: 'foo'}]));
                expect(repository.getOne('foo', 2)).toBe(undefined);
            });

            it('should return the first resource matching the identifier', function() {
                var repository = new Repository();
                repository.addResource('foo', new Resource([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                expect(repository.getOne('foo', 1)).toEqual({id: 1, name: 'foo'});
                expect(repository.getOne('foo', 2)).toEqual({id: 2, name: 'bar'});
            });

            it('should use the identifierName', function() {
                var repository = new Repository();
                repository.addResource('foo', new Resource([{_id: 1, name: 'foo'}, {_id: 2, name: 'bar'}], '_id'));
                expect(repository.getOne('foo', 1)).toEqual({_id: 1, name: 'foo'});
                expect(repository.getOne('foo', 2)).toEqual({_id: 2, name: 'bar'});
            });

        });

    });
})();
