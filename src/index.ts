import {
    getSinonHandler,
    Server,
    SinonServer,
} from './adapters/SinonServer.js';
import {
    getFetchMockHandler,
    FetchServer,
    FetchMockServer,
} from './adapters/FetchMockServer.js';
import { getMswHandler, MswServer } from './adapters/MswServer.js';
import { Database } from './Database.js';
import { SimpleRestServer } from './SimpleRestServer.js';
import { Collection } from './Collection.js';
import { Single } from './Single.js';
import { withDelay } from './withDelay.js';

export {
    SimpleRestServer,
    Database,
    getSinonHandler,
    getFetchMockHandler,
    getMswHandler,
    Server,
    SinonServer,
    FetchServer,
    FetchMockServer,
    MswServer,
    Collection,
    Single,
    withDelay,
};

export default {
    SimpleRestServer,
    Database,
    getSinonHandler,
    getFetchMockHandler,
    getMswHandler,
    Server,
    SinonServer,
    FetchServer,
    FetchMockServer,
    MswServer,
    Collection,
    Single,
    withDelay,
};
