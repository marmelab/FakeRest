# ng-admin FakeRest demo

This is a demo of [ng-admin](https://github.com/marmelab/ng-admin) working without backend thanks to FakeRest.

It's as simple as:

```js
// setup fake server
var restServer = new FakeRest.Server('http://foo.bar.baz');
restServer.init(data);
// use sinon.js to monkey-patch XmlHttpRequest
var server = sinon.fakeServer.create();
server.autoRespond = true;
server.autoRespondAfter = 0; // answer immediately
server.respondWith(restServer.getHandler());
```

## Installation

```
bower install
```
