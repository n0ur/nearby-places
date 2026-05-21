import { describe, it } from "node:test";
import assert from "node:assert";
import { constructLegacySearchParams } from "../../src/services/gmaps.js";

describe("constructLegacySearchParams", () => {
  it("constructs a valid object", () => {
    // arrange
    const params = {
      location: {
        lat: 123,
        lng: 456,
      },
      radius: 400,
      opennow: true,
      type: "bar",
    };

    // act
    const obj = constructLegacySearchParams(params);

    // assert
    assert.deepEqual(obj, params);
  });

  it("throws on missing properties", () => {
    // missing radius
    assert.throws(
      () =>
        constructLegacySearchParams({
          location: {
            lat: 123,
            lng: 456,
          },
          radius: 400,
          type: "bar",
        }),
      {
        name: "ValidationError",
      },
    );
    // missing location.lat
    assert.throws(
      () =>
        constructLegacySearchParams({
          location: {
            lng: 456,
          },
          radius: 400,
          opennow: true,
          type: "bar",
        }),
      {
        name: "ValidationError",
      },
    );
  });
});
