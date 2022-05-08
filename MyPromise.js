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
      resolver(this.#onSuccess.bind(this), this.#onFailed.bind(this));
      // Whenever created a promice it will automaticaly called the resolver cb function
    } catch (e) {
      // Promice got rejected when there is runtime erro.
      this.#onFailed(e);
    }
  }

  #onSuccess(value) {
    // The resolve method should only called for 1 time.
    // Promise is in the PENDING state when it settled for first time.
    // When resolve method get called in the first time the promice obj state will get updated.
    // If not in the pending state resolve method just returned without executing the body.
    if (this.#state !== STATES.PENDING) return;

    this.#state = STATES.FULFILLED;
    this.#value = value;

    this.#runCallbacks(this.#thenCbs);
  }

  #onFailed(error) {
    if (this.#state !== STATES.PENDING) return;

    this.#state = STATES.REJECTED;
    this.#value = error;

    this.#runCallbacks(this.#catchCbs);
  }

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
          return
        }

        try {
          // Returning prior thenCb return values to later handler.
          // somePromise.then(r => change(r)).then(cb)
          resolve(thenCb(result));
        }catch(e) {
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
          return
        }
        
        try{
          // When there is catchCb and prior resolver got exception.
          // catch handler handle the exception and chained resolver get called.
          resolve(catchCb(result))
        }catch(e) {
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

    return this.then((value) => {
      cb();
      return value; // This will be pass to post then/catch handlers
    }, (error) => {
      cb();
      throw error; // This will be pass to post then/catch handlers
    });
  }

  static resolve() {}

  static reject() {}

  static all() {}

  static allSettled() {}

  static race() {}

  static any() {}
}

module.exports = MyPromise;
