import chalk from 'chalk';

type LogLevel = 'base' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerColors {
  base?: string;
  info?: string;
  warn?: string;
  error?: string;
  debug?: string;
}

interface LoggerOptions {
  prefix?: string;
  usePrefix?: boolean;
  colors?: LoggerColors;
}

class Logger {
  private usePrefix: boolean;
  private colors: LoggerColors;
  private readonly prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.usePrefix = options.usePrefix !== undefined ? options.usePrefix : true;
    this.colors = options.colors || {
      base: 'white',
      info: 'blue',
      warn: 'yellow',
      error: 'red',
      debug: 'green',
    };
    this.prefix = chalk.magenta('[armature]');
  }

  private highlightUrls(message: string): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return message.replace(urlRegex, (url) => chalk.magenta(url));
  }

  private formatMessage(message: any): string {
    if (typeof message === 'object') {
      return Bun.inspect(message);
    }
    return message.toString();
  }

  private log(message: any, level: LogLevel = 'base'): void {
    const color = this.colors[level] || 'white';
    const prefix = this.usePrefix ? `${this.prefix} ` : '';
    const formattedMessage = this.highlightUrls(this.formatMessage(message));
    console.log((chalk as any)[color](`${prefix}${formattedMessage}`));
  }

  public gen(message: any): void {
    this.log(message, 'base');
  }

  public info(message: any): void {
    this.log(`[INFO] ${this.formatMessage(message)}`, 'info');
  }

  public warn(message: any): void {
    this.log(`[WARN] ${this.formatMessage(message)}`, 'warn');
  }

  public error(message: any): void {
    this.log(`[ERROR] ${this.formatMessage(message)}`, 'error');
  }

  public debug(message: any): void {
    this.log(`[DEBUG] ${this.formatMessage(message)}`, 'debug');
  }
}

export default Logger;
