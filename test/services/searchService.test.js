import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { setTimeout } from "node:timers/promises";
import { SearchService } from "../../src/services/searchService.js";

const mockRoom = {
  notificationService: {
    notify: mock.fn(),
  },
  logger: {
    info: mock.fn(),
  },
};

const mockSearchFn = mock.fn(async () => {
  return Promise.resolve([{ results: [] }]);
});

const searchParams = {
  location: {
    lat: 123,
    lng: 456,
  },
  radius: 400,
  opennow: true,
  type: "bar",
};

describe("SearchService", () => {
  beforeEach(() => {
    mockSearchFn.mock.resetCalls();
    mockRoom.notificationService.notify.mock.resetCalls();
    mockRoom.logger.info.mock.resetCalls();
  });

  it("constructs a request from params and runs it", async () => {
    // arrange
    const searchService = new SearchService(mockSearchFn);

    // act
    await searchService.search("user-1", searchParams, mockRoom);

    // assert
    assert.strictEqual(mockSearchFn.mock.callCount(), 1);
    assert.strictEqual(mockRoom.notificationService.notify.mock.callCount(), 1);
  });

  it("executes search once when called multiple times with the same params", async () => {
    // arrange
    const searchService = new SearchService(mockSearchFn);

    // act
    await searchService.search("user-1", searchParams, mockRoom);
    await searchService.search("user-1", searchParams, mockRoom);

    // assert
    assert.strictEqual(mockSearchFn.mock.callCount(), 1);
    assert.strictEqual(mockRoom.notificationService.notify.mock.callCount(), 1);
  });

  it("executes multiple times when called with different params", async () => {
    // arrange
    const searchService = new SearchService(mockSearchFn);

    // act
    searchService.search("user-1", searchParams, mockRoom);
    searchService.search("user-1", { ...searchParams, radius: 600 }, mockRoom);

    // assert
    assert.strictEqual(mockSearchFn.mock.callCount(), 2);
  });

  it("cancels the old request and makes a new one when params are different", async () => {
    // arrange
    const mockSearchFn = mock.fn(async () => {
      await setTimeout(100);
      return Promise.resolve([{ results: [] }]);
    });
    const searchService = new SearchService(mockSearchFn);

    // act
    const data = await Promise.all([
      searchService.search("user-1", searchParams, mockRoom),
      searchService.search(
        "user-1",
        { ...searchParams, radius: 600 },
        mockRoom,
      ),
      searchService.search(
        "user-1",
        { ...searchParams, opennow: false },
        mockRoom,
      ),
    ]);

    // assert
    assert.strictEqual(mockSearchFn.mock.callCount(), data.length);
    assert.deepEqual(data, ["Aborted", "Aborted", [{ results: [] }]]);
  });
});
