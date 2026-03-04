import type { ISequenceManager } from "../interfaces/ISequenceManager";

export class SequenceManager implements ISequenceManager {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing: boolean = false;

  public add(task: () => Promise<void>): void {
    this.queue.push(task);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length == 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      //return the first action to execute
      const task = this.queue.shift();

      if (task) {
        try {
          //await locks the queue until the end of the animation
          await task();
        } catch (error) {
          console.error("Error into action sequences", error);
        }
      }
    }

    this.isProcessing = false;
  }

  public wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
