export class Lock {
  readonly #queue: ((value: (() => void) | PromiseLike<() => void>) => void)[] =
    [];

  #aquired = false;

  async aquire(): Promise<() => void> {
    return new Promise((resolve) => {
      this.#queue.push(resolve);
      this.#tryAcquisition();
    });
  }

  readonly #tryAcquisition = (): void => {
    if (this.#aquired) {
      return;
    }

    const resolve = this.#queue.shift();

    if (!resolve) {
      return;
    }

    this.#aquired = true;

    resolve(() => {
      this.#aquired = false;

      this.#tryAcquisition();
    });
  };
}
