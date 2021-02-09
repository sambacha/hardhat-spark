export class Mutex {
  private _lock: any;

  isLocked() {
    return this._lock != undefined;
  }

  acquireQueued() {
    const q = Promise.resolve(this._lock).then(() => release);
    const release = this._acquire();
    return q;
  }

  _acquire() {
    let release;
    const lock = this._lock = new Promise(resolve => {
      release = resolve;
    });
    return () => {
      if (this._lock == lock) this._lock = undefined;
      release();
    };
  }
}
