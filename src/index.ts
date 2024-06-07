import {
    getSinonHandler,
    Server,
    SinonAdapter,
} from './adapters/SinonAdapter.js';
import {
    getFetchMockHandler,
    FetchServer,
    FetchMockAdapter,
} from './adapters/FetchMockAdapter.js';
import { getMswHandler, MswAdapter } from './adapters/MswAdapter.js';
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
    SinonAdapter,
    FetchServer,
    FetchMockAdapter,
    MswAdapter,
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
    SinonAdapter,
    FetchServer,
    FetchMockAdapter,
    MswAdapter,
    Collection,
    Single,
    withDelay,
};
