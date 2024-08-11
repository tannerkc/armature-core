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
    this.prefix = chalk.magenta('[reactive]');
  }

  private highlightUrls(message: string): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return message.replace(urlRegex, (url) => chalk.magenta(url));
  }

  private log(message: string, level: LogLevel = 'base'): void {
    const color = this.colors[level] || 'white';
    const prefix = this.usePrefix ? `${this.prefix} ` : '';
    const formattedMessage = this.highlightUrls(message);
    console.log((chalk as any)[color](`${prefix}${formattedMessage}`));
  }

  public gen(message: string): void {
    this.log(message, 'base');
  }

  public info(message: string): void {
    this.log(message, 'info');
  }

  public warn(message: string): void {
    this.log(message, 'warn');
  }

  public error(message: string): void {
    this.log(message, 'error');
  }

  public debug(message: string): void {
    this.log(message, 'debug');
  }
}

export default Logger;
