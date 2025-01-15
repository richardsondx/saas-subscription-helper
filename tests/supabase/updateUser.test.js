const { mockSupabase } = require('../setup');
const { updateUser } = require('../../src/supabase');

describe('updateUser', () => {
    const config = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        table: 'users',
        emailField: 'email',
        debug: true
    };

    let updateMock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup the mock chain properly
        const mockData = {
            id: 1,
            email: 'test@example.com',
            subscription_status: 'active',
            plan: 'premium'
        };

        // Create a mock for the update function
        updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    data: [mockData],
                    error: null
                })
            })
        });

        // Mock for initial user check and update
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: mockData,
                        error: null
                    })
                })
            }),
            update: updateMock  // Use the update mock
        }));
    });

    it('successfully updates user subscription', async () => {
        const updateData = {
            subscription_status: 'active',
            plan: 'premium'
        };

        const result = await updateUser(config, 'test@example.com', updateData);

        // Verify the update was called correctly
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
        expect(updateMock).toHaveBeenCalledWith(updateData);
        expect(result).toEqual(expect.objectContaining(updateData));
    });

    it('handles user not found', async () => {
        // Override mock for this test case
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: null
                    })
                })
            })
        }));

        await expect(
            updateUser(config, 'nonexistent@example.com', {
                subscription_status: 'active'
            })
        ).rejects.toThrow('User with email nonexistent@example.com not found');
    });

    it('handles database errors', async () => {
        // Mock a database error
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Database error' }
                    })
                })
            })
        }));

        await expect(
            updateUser(config, 'test@example.com', {
                subscription_status: 'active'
            })
        ).rejects.toThrow('Database error');
    });

    it('logs debug information when debug is enabled', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        
        const updateData = {
            subscription_status: 'active',
            plan: 'premium'
        };

        await updateUser(config, 'test@example.com', updateData);

        // Verify debug logs were called with actual messages
        expect(consoleSpy).toHaveBeenCalledWith(
            '[DEBUG] UpdateUser called with:',
            expect.objectContaining({
                table: 'users',
                email: 'test@example.com',
                emailField: 'email',
                subscriptionDetails: updateData
            })
        );

        expect(consoleSpy).toHaveBeenCalledWith(
            '[DEBUG] Update successful:',
            expect.objectContaining({
                rowsAffected: 1,
                updatedData: expect.objectContaining({
                    id: 1,
                    email: 'test@example.com',
                    subscription_status: 'active',
                    plan: 'premium'
                })
            })
        );
    });

    it('logs debug information on error', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        
        // Mock update to return error
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Update failed' }
                    })
                })
            })
        }));

        const updateData = { status: 'active' };

        await expect(
            updateUser(config, 'test@example.com', updateData)
        ).rejects.toThrow();

        // Verify error debug logs with actual message
        expect(consoleSpy).toHaveBeenCalledWith(
            '[DEBUG] UpdateUser called with:',
            expect.objectContaining({
                table: 'users',
                email: 'test@example.com',
                emailField: 'email',
                subscriptionDetails: updateData
            })
        );
    });

    it('logs debug information for fetch error', async () => {
        const consoleSpy = jest.spyOn(console, 'error');
        
        // Mock fetch error
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: {
                            message: 'Database error',
                            details: 'Connection failed',
                            hint: 'Check connection'
                        }
                    })
                })
            })
        }));

        await expect(
            updateUser(config, 'test@example.com', { status: 'active' })
        ).rejects.toThrow('User check failed: Database error');

        // Verify error debug logs
        expect(consoleSpy).toHaveBeenCalledWith(
            '[DEBUG] Error checking existing user:',
            expect.objectContaining({
                error: expect.objectContaining({
                    message: 'Database error',
                    details: 'Connection failed',
                    hint: 'Check connection'
                }),
                email: 'test@example.com'
            })
        );
    });

    it('logs debug information for user not found', async () => {
        const consoleSpy = jest.spyOn(console, 'error');
        
        // Mock user not found
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: null
                    })
                })
            })
        }));

        await expect(
            updateUser(config, 'nonexistent@example.com', { status: 'active' })
        ).rejects.toThrow('User with email nonexistent@example.com not found');

        // Verify user not found debug logs
        expect(consoleSpy).toHaveBeenCalledWith(
            '[DEBUG] User not found:',
            expect.objectContaining({
                email: 'nonexistent@example.com'
            })
        );
    });

    it('logs debug information for database fetch error', async () => {
        const consoleSpy = jest.spyOn(console, 'error');
        
        // Mock the Supabase client to return a fetch error
        const mockError = {
            message: 'Database error',
            details: 'Connection failed',
            hint: 'Check connection'
        };

        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: mockError
                    })
                })
            })
        }));

        try {
            await updateUser(config, 'test@example.com', { status: 'active' });
        } catch (error) {
            // Verify the first error debug log (fetch error)
            expect(consoleSpy).toHaveBeenNthCalledWith(1,
                '[DEBUG] Error checking existing user:',
                {
                    error: mockError,
                    email: 'test@example.com'
                }
            );
        }

        // Clean up
        consoleSpy.mockRestore();
    });

    it('logs debug information when user is not found', async () => {
        const consoleSpy = jest.spyOn(console, 'error');
        
        // Mock Supabase to return no user and no error
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: null
                    })
                })
            })
        }));

        await expect(
            updateUser(config, 'nonexistent@example.com', { status: 'active' })
        ).rejects.toThrow('User with email nonexistent@example.com not found');

        // Verify user not found debug logs
        expect(consoleSpy).toHaveBeenCalledWith(
            '[DEBUG] User not found:',
            {
                email: 'nonexistent@example.com'
            }
        );

        // Clean up
        consoleSpy.mockRestore();
    });

    // Clean up after each test
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });
}); 