export async function timeout<TResult>(
  operation: Promise<TResult>,
  duration: number
): Promise<TResult> {
  let timeoutId: any;

  return Promise.race([
    operation.then((result) => {
      clearTimeout(timeoutId);

      return result;
    }),
    new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Timeout after ${duration} milliseconds.`)),
        duration
      );
    }),
  ]);
}
