export class KeyMutex {
  private _lock: {
    [key: string]: any
  };

  constructor() {
    this._lock = {};
  }

  isLocked(key: string) {
    return this._lock[key] != undefined;
  }

  acquireQueued(key: string) {
    const q = Promise.resolve(this._lock[key]).then(() => release);
    const release = this._acquire(key);
    return q;
  }

  _acquire(key: string) {
    let release;
    const lock = this._lock[key] = new Promise(resolve => {
      release = resolve;
    });
    return () => {
      if (this._lock[key] == lock) {
        this._lock[key] = undefined;
      }

      release();
    };
  }
}
