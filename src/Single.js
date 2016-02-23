import objectAssign from 'object.assign';
import 'string.prototype.endswith';

export default class Single {
    constructor(obj) {
        if (!(obj instanceof Object)) {
            throw new Error('Can\'t initialize a Single with anything except an object');
        }
        this.obj = obj;
        this.server = null;
        this.name = null;
    }

    /**
     * A Single may need to access other collections (e.g. for embedded
     * references) This is done through a reference to the parent server.
     */
    setServer(server) {
        this.server = server;
    }

    setName(name) {
        this.name = name;
    }

    // No need to embed Singles, since they are by their nature top-level
    // No need to worry about remote references, (i.e. mysingleton_id=1) since
    // it is by definition a singleton
    _oneToManyEmbedder(resourceName) {
        return (item) => {
            const otherCollection = this.server.collections[resourceName];
            if (!otherCollection) throw new Error(`Can't embed a non-existing collection ${resourceName}`);
            // We have an array of ids {posts: [1,2]} (back refs are not valid
            // for singleton)
            item[resourceName] = otherCollection.getAll({
                filter: i => item[resourceName].indexOf(i[otherCollection.identifierName]) !== -1
            });
            return item;
        };      
    }

    _manyToOneEmbedder(resourceName) {
        const pluralResourceName = resourceName + 's';
        const referenceName = resourceName + '_id';
        return (item) => {
            const otherCollection = this.server.collections[pluralResourceName];
            if (!otherCollection) throw new Error(`Can't embed a non-existing collection ${resourceName}`);
            try {
                item[resourceName] = otherCollection.getOne(item[referenceName]);
            } catch (e) {
                // Resource doesn't exist, so don't embed
            }
            return item;
        };
    }

    _itemEmbedder(embed) {
        const resourceNames = Array.isArray(embed) ? embed : [embed];
        const resourceEmbedders = resourceNames.map(resourceName =>
           resourceName.endsWith('s') ? this._oneToManyEmbedder(resourceName) : this._manyToOneEmbedder(resourceName)
        );
        return item => resourceEmbedders.reduce((itemWithEmbeds, embedder) => embedder(itemWithEmbeds), item);
    }

    getOnly(query) {
        let item = this.obj;
        if (query && query.embed && this.server) {
            item = objectAssign({}, item); // Clone
            item = this._itemEmbedder(query.embed)(item);
        }
        return item;
    }

    updateOnly(item) {
        for (let key in item) {
            this.obj[key] = item[key];
        }
        return this.obj;
    }
}
