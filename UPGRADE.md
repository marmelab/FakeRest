# Upgrading to 4.0.0

## Constructors Of `FetchServer` and `Server` Take An Object

For `Server`:

```diff
import { Server } from 'fakerest';
import { data } from './data';

-const server = new Server('http://myapi.com');
+const server = new Server({ baseUrl: 'http://myapi.com' });
server.init(data);
```

For `FetchServer`:

```diff
import { FetchServer } from 'fakerest';
import { data } from './data';

-const server = new FetchServer('http://myapi.com');
+const server = new FetchServer({ baseUrl: 'http://myapi.com' });
server.init(data);
```

## Constructor Of `Collection` Take An Object

```diff
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

## Request and Response Interceptors Have Been Replaced By Middlewares

Fakerest used to have request and response interceptors. We replaced those with middlewares. They allow much more use cases.

Migrate your request interceptors:

```diff
-restServer.addRequestInterceptor(function(request) {
+restServer.addMiddleware(async function(request, context, next) {
    var start = (request.params._start - 1) || 0;
    var end = request.params._end !== undefined ? (request.params._end - 1) : 19;
    request.params.range = [start, end];
-    return request; // always return the modified input
+    return next(request, context);
});
```

Migrate your response interceptors:

```diff
-restServer.addResponseInterceptor(function(response) {
+restServer.addMiddleware(async function(request, context, next) {
+    const response = await next(request, context);
    response.body = { data: response.body, status: response.status };
    return response;
});
```