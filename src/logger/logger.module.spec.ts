import { shouldSaveLogToFile } from './logger.module'

describe('shouldSaveLogToFile', () => {
  it.each([
    ['development', true, true],
    ['development', false, false],
    ['test', false, true],
    ['production', false, true],
  ] as const)(
    'should return %s/%s as %s',
    (environment, logFileEnabled, expected) => {
      expect(shouldSaveLogToFile(environment, logFileEnabled)).toBe(expected)
    },
  )
})
