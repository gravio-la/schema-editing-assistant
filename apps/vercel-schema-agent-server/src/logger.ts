import { createLogger, format, transports } from 'winston'
import config from './config'

const logger = createLogger({
  level: config.LOG_LEVEL,
  format: format.combine(
    format.timestamp(),
    format.colorize(),
    format.simple(),
  ),
  transports: [new transports.Console()],
})

export default logger
