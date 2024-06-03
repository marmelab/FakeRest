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

## Constructor Of `Collection` Takes An Object

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