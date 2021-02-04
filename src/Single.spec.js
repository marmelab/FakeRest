import { Single } from "./Single";
import { Collection } from "./Collection";
import { Server } from "./Server";

describe("Single", () => {
  describe("constructor", () => {
    it("should set the intial set of data", () => {
      const single = new Single({ foo: "bar" });
      expect(single.getOnly()).toEqual({ foo: "bar" });
    });
  });

  describe("getOnly", () => {
    it("should return the passed in object", () => {
      const single = new Single({ foo: "bar" });
      expect(single.getOnly()).toEqual({ foo: "bar" });
    });

    describe("embed query", () => {
      it("should throw an error when trying to embed a non-existing collection", () => {
        const foo = new Single({ name: "foo", bar_id: 123 });
        const server = new Server();
        server.addSingle("foo", foo);
        expect(() => {
          foo.getOnly({ embed: ["bar"] });
        }).toThrow(new Error("Can't embed a non-existing collection bar"));
      });

      it("should return the original object for misisng embed one", () => {
        const foo = new Single({ name: "foo", bar_id: 123 });
        const bars = new Collection([]);
        const server = new Server();
        server.addSingle("foo", foo);
        server.addCollection("bars", bars);
        const expected = { name: "foo", bar_id: 123 };
        expect(foo.getOnly({ embed: ["bar"] })).toEqual(expected);
      });

      it("should return the object with the reference object for embed one", () => {
        const foo = new Single({ name: "foo", bar_id: 123 });
        const bars = new Collection([
          { id: 1, bar: "nobody wants me" },
          { id: 123, bar: "baz" },
          { id: 456, bar: "bazz" },
        ]);
        const server = new Server();
        server.addSingle("foo", foo);
        server.addCollection("bars", bars);
        const expected = {
          name: "foo",
          bar_id: 123,
          bar: { id: 123, bar: "baz" },
        };
        expect(foo.getOnly({ embed: ["bar"] })).toEqual(expected);
      });

      it("should throw an error when trying to embed many a non-existing collection", () => {
        const foo = new Single({ name: "foo", bar_id: 123 });
        const server = new Server();
        server.addSingle("foo", foo);
        expect(() => {
          foo.getOnly({ embed: ["bars"] });
        }).toThrow(new Error("Can't embed a non-existing collection bars"));
      });

      it("should return the object with an array of references for embed many using inner array", () => {
        const foo = new Single({ name: "foo", bars: [1, 3] });
        const bars = new Collection([
          { id: 1, bar: "baz" },
          { id: 2, bar: "biz" },
          { id: 3, bar: "boz" },
        ]);
        const server = new Server();
        server.addSingle("foo", foo);
        server.addCollection("bars", bars);
        const expected = {
          name: "foo",
          bars: [
            { id: 1, bar: "baz" },
            { id: 3, bar: "boz" },
          ],
        };
        expect(foo.getOnly({ embed: ["bars"] })).toEqual(expected);
      });

      it("should allow multiple embeds", () => {
        const foo = new Single({ name: "foo", bars: [1, 3], bazs: [4, 5] });
        const bars = new Collection([
          { id: 1, name: "bar1" },
          { id: 2, name: "bar2" },
          { id: 3, name: "bar3" },
        ]);
        const bazs = new Collection([
          { id: 4, name: "baz1" },
          { id: 5, name: "baz2" },
          { id: 6, name: "baz3" },
        ]);
        const server = new Server();
        server.addSingle("foo", foo);
        server.addCollection("bars", bars);
        server.addCollection("bazs", bazs);
        const expected = {
          name: "foo",
          bars: [
            { id: 1, name: "bar1" },
            { id: 3, name: "bar3" },
          ],
          bazs: [
            { id: 4, name: "baz1" },
            { id: 5, name: "baz2" },
          ],
        };
        expect(foo.getOnly({ embed: ["bars", "bazs"] })).toEqual(expected);
      });
    });
  });

  describe("updateOnly", () => {
    it("should return the updated item", () => {
      const single = new Single({ name: "foo" });
      expect(single.updateOnly({ name: "bar" })).toEqual({ name: "bar" });
    });

    it("should update the item", () => {
      const single = new Single({ name: "foo" });
      single.updateOnly({ name: "bar" });
      expect(single.getOnly()).toEqual({ name: "bar" });
    });
  });
});
