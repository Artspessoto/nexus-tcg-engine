export enum LogType {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export type LogModule = "AI" | "COMBAT" | "EFFECT" | "SYSTEM" | "EVENT";

export class Logger {
  private static readonly validEnv =
    process.env.NODE_ENV == "development" || process.env.NODE_ENV == "test";
  private static type: LogType = Logger.validEnv
    ? LogType.DEBUG
    : LogType.ERROR;

  private static colors: Record<LogModule, string> = {
    AI: "#a29bfe",
    COMBAT: "#ff7675",
    EFFECT: "#81ecec",
    SYSTEM: "#ffeaa7",
    EVENT: "#00ff00",
  };

  public static debug<T>(
    module: keyof typeof Logger.colors,
    message: string,
    data?: T,
  ) {
    if (this.type > LogType.DEBUG) return;

    const color = this.colors[module];
    const logHeader = `%c[${module}]`;
    const style = `background: ${color}; color: #000; font-weight: bold; border-radius: 2px; padding: 0 4px;`;

    if (data !== undefined) {
      console.log(
        `${logHeader}%c ${message}`,
        style,
        "color: #fff; font-weight: normal;",
        data,
      );
    } else {
      console.log(
        `${logHeader}%c ${message}`,
        style,
        "color: #fff; font-weight: normal;",
      );
    }
  }

  public static warn(message: string, context?: unknown) {
    if (this.type <= LogType.WARN)
      console.warn(
        `%c[WARN]%c ${message}`,
        "color: #fdcb6e; font-weight: bold;",
        "color: inherit;",
        context || "",
      );
  }

  public static error(message: string, error?: unknown) {
    if (this.type <= LogType.ERROR)
      console.error(
        `%c[ERROR]%c ${message}`,
        "color: #ff7675; font-weight: bold;",
        "color: inherit;",
        error,
      );
  }
}
