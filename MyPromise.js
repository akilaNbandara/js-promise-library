// Usage of Promises
/*
  const otherTask = new Promise((res, rej) => {
    someTask().then(res).catch(rej);
    // or
    someTask((result, error) => {
      if (error) return rej();
      else return res();
    });
  });

  // Chaining 
  otherTask.then(cb1).catch(eh).then(cb2)

 */

// Promise states
/*
  fulfilled: Action related to the promise succeeded.
  rejected: Action related to the promise failed.
  pending: Promise is still pending i.e. not fulfilled or rejected yet.
  settled: Promise has fulfilled or rejected.
 */

const STATES = {
  FULFILLED: "FULFILED",
  REJECTED: "REJECTED",
  PENDING: "PENDING",
  SETTLED: "SETTLED",
};

class MyPromise {
  #state = STATES.PENDING;
  #value;

  constructor(resolver) {
    try {
      resolver(this.#onSuccess, this.#onFailed);
      // Whenever created a promice it will automaticaly called the resolver cb function
    } catch (e) {
      // Promice got rejected when there is runtime erro.
      this.#onFailed(e);
    }
  }

  #onSuccess = (value) => {
    // The resolve method should only called for 1 time.
    // Promise is in the PENDING state when it settled for first time.
    // When resolve method get called in the first time the promice obj state will get updated.
    // If not in the pending state resolve method just returned without executing the body.
    if (this.#state !== STATES.PENDING) return;

    if (value instanceof MyPromise) {
      // If resolve called with another promise
      value.then(this.#onSuccess, this.#onFailed);
      return;
    }

    this.#state = STATES.FULFILLED;
    this.#value = value;

    this.#runCallbacks(this.#thenCbs);
  };

  #onFailed = (error) => {
    if (this.#state !== STATES.PENDING) return;

    if (error instanceof MyPromise) {
      // If resolve called with another promise
      value.then(this.#onSuccess, this.#onFailed);
      return;
    }

    this.#state = STATES.REJECTED;
    this.#value = error;

    if (this.#catchCbs.length === 0) {
      throw new UncaughtPromiseError("Unhandle catch");
    }
    this.#runCallbacks(this.#catchCbs);
  };

  #thenCbs = [];
  #catchCbs = [];

  // Iterate and call callbacks of array.
  #runCallbacks(cbArray) {
    while (cbArray.length > 0) {
      const cb = cbArray.pop();
      cb(this.#value);
    }
  }

  // Handle then method in promise object
  then(thenCb, catchCb) {
    // Returning promise to chaining
    // Call resolve and reject returned Promise after calling prior then callbacks
    return new MyPromise((resolve, reject) => {
      this.#thenCbs.push((result) => {
        if (!thenCb) {
          // If there is no then call back that means it a catch handler
          // somePromise.catch(eh).then(cb)
          resolve(result);
          return;
        }

        try {
          // Returning prior thenCb return values to later handler.
          // somePromise.then(r => change(r)).then(cb)
          resolve(thenCb(result));
        } catch (e) {
          // If failed execution of thenCb or resolveCb will reject the returned promise.
          // It will hit later catch
          // somePromise.then(method).then(exception).catch();
          reject(e);
        }
      });

      // Create new catch callback to pass results to post handlers
      this.#catchCbs.push((result) => {
        if (!catchCb) {
          // If there is no catch callback on exception of resolver, it will reject chained promise
          reject(result);
          return;
        }

        try {
          // When there is catchCb and prior resolver got exception.
          // catch handler handle the exception and chained resolver get called.
          resolve(catchCb(result));
        } catch (e) {
          reject(e);
        }
      });

      // Check whether the Promise is already settled
      // Otherwise it will start to execute the callback Arrays
      if (this.#state === STATES.FULFILLED) {
        this.#runCallbacks(this.#thenCbs);
      } else if (this.#state === STATES.REJECTED) {
        this.#runCallbacks(this.#catchCbs);
      }
    });
  }

  catch(cb) {
    // The catch methods handle in the then.
    // catch also returned a promise
    return this.then(null, cb);
  }

  finally(cb) {
    // Finally also returning a new promise
    // but previous thenCb returned value not pass into finally handler
    // But value can be returned in to post then/catch handlers
    // p.then(v => r).finally(cb).then(r => q)

    return this.then(
      (value) => {
        cb();
        return value; // This will be pass to post then/catch handlers
      },
      (error) => {
        cb();
        throw error; // This will be pass to post then/catch handlers
      }
    );
  }

  static resolve(value) {
    // Just create new promise and resolve that using given value.

    return new MyPromise((resolve) => {
      resolve(value);
    });
  }

  static reject(error) {
    // Just create a new promise and reject that.

    return new MyPromise((resolve, reject) => {
      reject(error);
    });
  }

  static all(promiseArray) {
    // Promise all get resolved when all promises in the promise array get fullfiled.
    // If anyone got rejected it will got rejected.

    return new MyPromise((resolve, reject) => {
      const results = [];
      let resultCount = 0;

      promiseArray.forEach((promise, index) => {
        promise
          .then((value) => {
            results[index] = value;
            resultCount += 1;

            if (resultCount === promiseArray.length) {
              resolve(results);
            }
          })
          .catch((e) => {
            reject(e);
          });
      });
    });
  }

  static allSettled(promiseArray) {
    // Allsettled resolved after each and every promise get settled
    // After all settled promise resolved with the status array
    return new MyPromise((resolve) => {
      const results = [];
      let resultCount = 0;

      promiseArray.forEach((promise, index) => {
        resultCount++;
        promise
          .then((value) => {
            results[index] = { status: "fulfilled", value: value };

            if (resultCount === promiseArray.length) {
              resolve(results);
            }
          })
          .catch((e) => {
            results[index] = { status: "rejected", reason: e };

            if (resultCount === promiseArray.length) {
              resolve(results);
            }
          });
      });
    });
  }

  static race(promiseArray) {
    // Resolve or reject according to which is hit first
    return new MyPromise((resolve, reject) => {
      promiseArray.forEach((promise) => {
        promise
          .then(resolve)
          .catch(reject);
      });
    });
  }

  static any(promiseArray) {
    // Resolve if any promise got resolved
    // Reject if no any promises get resolved
    return new MyPromise((resolve, reject) => {
      const results = [];
      let resultCount = 0;

      promiseArray.forEach((promise, index) => {
        promise
          .then((value) => {
            resolve(value);
          })
          .catch((e) => {
            resultCount++;
            results[index] = value;

            if (resultCount === promiseArray.length) {
              reject(e);
            }
          });
      });
    });
  }
}

module.exports = MyPromise;

class UncaughtPromiseError extends Error {
  constructor(value) {
    super();
    this.message = value;
    this.stack = "in my promise: " + this.stack;
  }
}
