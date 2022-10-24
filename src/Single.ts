import { Server } from "./Server";

export class Single {
  obj: any = null;
  server: Server | null = null;
  name: string | null = null;

  constructor(obj: any) {
    if (!(obj instanceof Object)) {
      throw new Error(
        "Can't initialize a Single with anything except an object"
      );
    }
    this.obj = obj;
  }

  /**
   * A Single may need to access other collections (e.g. for embedded
   * references) This is done through a reference to the parent server.
   */
  setServer(server: Server): void {
    this.server = server;
  }

  setName(name: string): void {
    this.name = name;
  }

  // No need to embed Singles, since they are by their nature top-level
  // No need to worry about remote references, (i.e. mysingleton_id=1) since
  // it is by definition a singleton
  _oneToManyEmbedder(resourceName: string): (item: any) => any {
    return (item) => {
      if (this.server == null) {
        throw new Error("Can't embed without a server");
      }
      const otherCollection = this.server.collections[resourceName];
      if (!otherCollection)
        throw new Error(
          `Can't embed a non-existing collection ${resourceName}`
        );
      // We have an array of ids {posts: [1,2]} (back refs are not valid
      // for singleton)
      item[resourceName] = otherCollection.getAll({
        filter: (referenceItem: any): boolean =>
          item[resourceName].indexOf(
            referenceItem[otherCollection.identifierName]
          ) !== -1,
      });
      return item;
    };
  }

  _manyToOneEmbedder(resourceName: string): (item: any) => any {
    const pluralResourceName = resourceName + "s";
    const referenceName = resourceName + "_id";
    return (item) => {
      if (this.server == null) {
        throw new Error("Can't embed without a server");
      }
      const otherCollection = this.server.collections[pluralResourceName];
      if (!otherCollection)
        throw new Error(
          `Can't embed a non-existing collection ${resourceName}`
        );
      try {
        item[resourceName] = otherCollection.getOne(item[referenceName]);
      } catch (e) {
        // Resource doesn't exist, so don't embed
      }
      return item;
    };
  }

  _itemEmbedder(embed: any): (item: any) => any {
    const resourceNames = Array.isArray(embed) ? embed : [embed];
    const resourceEmbedders = resourceNames.map((resourceName) =>
      resourceName.endsWith("s")
        ? this._oneToManyEmbedder(resourceName)
        : this._manyToOneEmbedder(resourceName)
    );
    return (item) =>
      resourceEmbedders.reduce(
        (itemWithEmbeds, embedder) => embedder(itemWithEmbeds),
        item
      );
  }

  getOnly(query?: any): any {
    let item = this.obj;
    if (query && query.embed && this.server) {
      item = Object.assign({}, item); // Clone
      item = this._itemEmbedder(query.embed)(item);
    }
    return item;
  }

  updateOnly(item: any): any {
    for (let key in item) {
      this.obj[key] = item[key];
    }
    return this.obj;
  }
}
