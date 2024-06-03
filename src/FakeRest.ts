import { Server, SinonServer } from './SinonServer.js';
import { FetchServer, FetchMockServer } from './FetchMockServer.js';
import { Collection } from './Collection.js';
import { Single } from './Single.js';
import { getMswHandlers } from './msw.js';
import { get } from 'lodash';

export {
    Server,
    SinonServer,
    FetchServer,
    FetchMockServer,
    Collection,
    Single,
    getMswHandlers,
};
export default { Server, FetchServer, Collection, Single, getMswHandlers };
