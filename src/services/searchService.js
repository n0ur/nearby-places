export class SearchService {
  #constructParamsFn;
  #searchFn;
  #requests;

  constructor(constructParamsFn, searchFn) {
    this.#requests = new Map();
    this.#constructParamsFn = constructParamsFn;
    this.#searchFn = searchFn;
  }

  async search(userId, params, callback) {
    params = this.#constructParamsFn(params);
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
      if (abort.signal.aborted) {
        this.#requests.delete(hashedParams);
        return resolve("Aborted");
      }
      this.#searchFn(params)
        .then((data) => {
          if (abort.signal.aborted) {
            this.#requests.delete(hashedParams);
            return resolve("Aborted");
          }
          callback(params, data);
          this.#requests.delete(hashedParams);
          resolve(data);
        })
        .catch((e) => {
          this.#requests.delete(hashedParams);
          reject(e);
        });
    });

    this.#requests.set(hashedParams, {
      ...this.#requests.get(hashedParams),
      promise,
    });

    return promise;
  }

  requests() {
    return this.#requests;
  }
}
