module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: [
        '<rootDir>/tests/jest.setup.js',
        '<rootDir>/tests/setup.js'
    ],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/utils/logger.js'
    ],
    coverageThreshold: {
        global: {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80
        }
    },
    verbose: true,
    // Add this to handle ES modules if needed
    transform: {
        '^.+\\.js$': 'babel-jest'
    }
}; 