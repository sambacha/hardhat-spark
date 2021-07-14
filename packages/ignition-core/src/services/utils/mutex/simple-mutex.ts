export class Mutex {
  private _lock: any;

  public isLocked() {
    return this._lock !== undefined;
  }

  public acquireQueued() {
    const q = Promise.resolve(this._lock).then(() => release);
    const release = this._acquire();
    return q;
  }

  public _acquire() {
    let release: any;
    const lock = (this._lock = new Promise((resolve) => {
      release = resolve;
    }));
    return () => {
      if (this._lock === lock) {
        this._lock = undefined;
      }
      release();
    };
  }
}
