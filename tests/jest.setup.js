// Global test setup
beforeAll(() => {
    // Silence console logs during tests unless explicitly testing them
    console.log = jest.fn();
    console.error = jest.fn();
});

beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
}); 