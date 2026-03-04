export interface ISequenceManager {
  add(task: () => Promise<void>): void;
  wait(ms: number): Promise<void>;
}
