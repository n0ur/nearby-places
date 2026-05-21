import { constructLegacySearchParams } from "../services/gmaps.js";

export class SearchService {
  #searchFn;
  #requests;

  constructor(searchFn) {
    this.#requests = new Map();
    this.#searchFn = searchFn;
  }

  async search(userId, params, room) {
    params = constructLegacySearchParams(params);
    // hash params
    const hashedParams = JSON.stringify(params);
    if (this.#requests.has(hashedParams)) {
      return this.#requests.get(hashedParams).promise;
    }

    for (const [, { abort }] of this.#requests) {
      abort.abort();
    }

    this.#requests.set(hashedParams, {
      promise: null,
      abort: new AbortController(),
    });

    const promise = new Promise((resolve, reject) => {
      const { abort } = this.#requests.get(hashedParams);
      this.resolveIfAborted(resolve, abort);
      this.#searchFn(params)
        .then((data) => {
          this.resolveIfAborted(resolve, abort);
          room.notificationService.notify("places_found", {
            userId: userId,
            search: params,
            places: data,
          });
          room.logger.info(
            { event: "places_found", userId: userId, size: data.length },
            "Event emitted",
          );
          return data;
        })
        .then((data) => {
          resolve(data);
        })
        .catch((e) => {
          reject(e);
        });
    });

    this.#requests.set(hashedParams, {
      ...this.#requests.get(hashedParams),
      promise,
    });

    return promise;
  }

  resolveIfAborted(resolve, abort) {
    if (abort.signal.aborted) {
      return resolve("Aborted");
    }
  }
}
