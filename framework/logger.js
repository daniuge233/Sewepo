/*
日志模块
*/

class Logger {
  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 19);
  }

  log(source, message) {
    console.log(`[${this.getTimestamp()}] [${source}] [LOG] ${message}`);
  }

  info(source, message) {
    console.log(`[${this.getTimestamp()}] [${source}] [INFO] ${message}`);
  }

  warn(source, message) {
    console.warn(`[${this.getTimestamp()}] [${source}] [WARN] ${message}`);
  }

  error(source, message) {
    console.error(`[${this.getTimestamp()}] [${source}] [ERROR] ${message}`);
  }

  debug(source, message) {
    console.log(`[${this.getTimestamp()}] [${source}] [DEBUG] ${message}`);
  }
}

export default new Logger();
