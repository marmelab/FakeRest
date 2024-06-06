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
import { getMswHandlers, MswServer } from './adapters/msw.js';
import { Collection } from './Collection.js';
import { Single } from './Single.js';
import { withDelay } from './withDelay.js';

export {
    getSinonHandler,
    getFetchMockHandler,
    getMswHandlers,
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
    getSinonHandler,
    getFetchMockHandler,
    getMswHandlers,
    Server,
    SinonServer,
    FetchServer,
    FetchMockServer,
    MswServer,
    Collection,
    Single,
    withDelay,
};
