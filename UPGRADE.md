# Upgrading to 4.0.0

## Dropped bower support

Fakerest no longer supports bower. You can still use it in your project by installing it via npm:

```bash
npm install fakerest
```

## Renamed `Server` to `SinonAdapter`

The `Server` class has been renamed to `SinonAdapter` and now expects a configuration object instead of a URL.

```diff
import sinon from 'sinon';
-import { Server } from 'fakerest';
+import { SinonAdapter } from 'fakerest';
import { data } from './data';

-const server = new Server('http://myapi.com');
-server.init(data);
+const server = new SinonAdapter({ baseUrl: 'http://myapi.com', data });
const server = sinon.fakeServer.create();
server.respondWith(server.getHandler());
```

## Renamed `FetchServer` to `FetchMockAdapter`

The `FetchServer` class has been renamed to `FetchMockAdapter` and now expects a configuration object instead of a URL.

```diff
import fetchMock from 'fetch-mock';
-import { FetchServer } from 'fakerest';
+import { FetchMockAdapter } from 'fakerest';
import { data } from './data';

-const server = new FetchServer('http://myapi.com');
-server.init(data);
+const server = new FetchMockAdapter({ baseUrl: 'http://myapi.com', data });
fetchMock.mock('begin:http://myapi.com', server.getHandler());
```

## Constructor Of `Collection` Takes An Object

```diff
import { Collection } from 'fakerest';

-const posts = new Collection([
-    { id: 1, title: 'baz' },
-    { id: 2, title: 'biz' },
-    { id: 3, title: 'boz' },
-]);
+const posts = new Collection({
+    items: [
+        { id: 1, title: 'baz' },
+        { id: 2, title: 'biz' },
+        { id: 3, title: 'boz' },
+    ],
+});
```

## `addCollection` is now `adapter.server.addCollection`

```diff
import fetchMock from 'fetch-mock';
-import { FetchServer } from 'fakerest';
+import { FetchMockAdapter } from 'fakerest';
import { posts } from './posts';

-const server = new FetchServer('http://myapi.com');
-server.addCollection('posts', posts);
-fetchMock.mock('begin:http://myapi.com', server.getHandler());
+const adapter = new FetchMockAdapter({ baseUrl: 'http://myapi.com', data });
+adapter.server.addCollection('posts', posts);
+fetchMock.mock('begin:http://myapi.com', adapter.getHandler());
```

## Request and Response Interceptors Have Been Replaced By Middlewares

Fakerest used to have request and response interceptors. We replaced those with middlewares. They allow much more use cases.

Migrate your request interceptors to middlewares passed when building the handler:

```diff
- const myRequestInterceptor = function(request) {
+ const myMiddleware = async function(context, next) {
    var start = (request.params._start - 1) || 0;
    var end = request.params._end !== undefined ? (request.params._end - 1) : 19;
    request.params.range = [start, end];
-   return request; // always return the modified input
+   return next(context);
};

-restServer.addRequestInterceptor(myRequestInterceptor);
+const handler = new getMswHandler({
+   baseUrl: 'http://my.custom.domain',
+   data,
+   middlewares: [myMiddleware],
});
```

Migrate your response interceptors the same way.
