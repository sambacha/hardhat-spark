export class KeyMutex {
  private _lock: {
    [key: string]: any;
  };

  constructor() {
    this._lock = {};
  }

  public isLocked(key: string) {
    return this._lock[key] !== undefined;
  }

  public acquireQueued(key: string) {
    const q = Promise.resolve(this._lock[key]).then(() => release);
    const release = this._acquire(key);
    return q;
  }

  public _acquire(key: string) {
    let release: any;
    const lock = (this._lock[key] = new Promise((resolve) => {
      release = resolve;
    }));
    return () => {
      if (this._lock[key] === lock) {
        this._lock[key] = undefined;
      }

      release();
    };
  }
}
