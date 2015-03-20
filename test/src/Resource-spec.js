/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var Resource = FakeRest.getClass('Resource');
    
    describe('Resource', function() {

        describe('constructor', function() {
            it('should set the initial set of data', function() {
                var resource = new Resource([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(resource.getAll()).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
            });            
            it('should set identifier name to id by default', function() {
                var resource = new Resource();
                expect(resource.identifierName).toEqual('id');
            });            
        })

        describe('getAll', function() {
            it('should return an array', function() {
                expect(new Resource().getAll()).toEqual([]);
            });

            it('should return all resources', function() {
                var resource = new Resource([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(resource.getAll()).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
            });
        });

        describe('getOne', function() {
            it('should return undefined when no resource match the identifier', function() {
                expect(new Resource().getOne(12)).toBe(undefined);
            });

            it('should return the first resource matching the identifier', function() {
                var resource = new Resource([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(resource.getOne(1)).toEqual({id: 1, name: 'foo'});
                expect(resource.getOne(2)).toEqual({id: 2, name: 'bar'});
            });

            it('should use the identifierName', function() {
                var resource = new Resource([{_id: 1, name: 'foo'}, {_id: 2, name: 'bar'}], '_id');
                expect(resource.getOne(1)).toEqual({_id: 1, name: 'foo'});
                expect(resource.getOne(2)).toEqual({_id: 2, name: 'bar'});
            });

        });

    });
})();
