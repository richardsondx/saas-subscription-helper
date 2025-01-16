const { mockSupabase } = require('../setup');
const { updateUser } = require('../../src/supabase');

describe('updateUser', () => {
    const config = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        table: 'users',
        emailField: 'email',
        debug: true,
        createUserIfNotExists: false
    };

    let updateMock;

    beforeEach(() => {
        jest.clearAllMocks();
        updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    data: [{
                        id: 1,
                        email: 'test@example.com',
                        subscription_status: 'active',
                        plan: 'premium'
                    }],
                    error: null
                })
            })
        });

        const mockData = {
            id: 1,
            email: 'test@example.com',
            subscription_status: 'active',
            plan: 'premium'
        };

        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: mockData,
                        error: null
                    })
                })
            }),
            update: updateMock,
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: mockData,
                        error: null
                    })
                })
            })
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
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' }
                    })
                })
            }),
            update: updateMock,
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
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
        ).rejects.toThrow('User with email nonexistent@example.com not found in users');
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
        const consoleSpy = jest.spyOn(console, 'log');
        
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' }
                    })
                })
            }),
            update: updateMock,
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: null
                    })
                })
            })
        }));

        await expect(
            updateUser(config, 'nonexistent@example.com', { status: 'active' })
        ).rejects.toThrow('User with email nonexistent@example.com not found in users');

        expect(consoleSpy).toHaveBeenCalledWith(
            '[DEBUG] User not found in database:',
            expect.objectContaining({
                email: 'nonexistent@example.com',
                table: 'users'
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

    it('handles user not found when createUserIfNotExists is false', async () => {
        // Mock user not found response (PGRST116 is the "not found" code)
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' }
                    })
                })
            })
        }));

        await expect(
            updateUser(config, 'nonexistent@example.com', {
                subscription_status: 'active'
            })
        ).rejects.toThrow('User with email nonexistent@example.com not found in users');
    });

    it('creates new user when createUserIfNotExists is true', async () => {
        const configWithCreate = {
            ...config,
            createUserIfNotExists: true
        };

        const newUserData = {
            id: 2,
            email: 'new@example.com',
            subscription_status: 'active'
        };

        // Mock user not found, then successful creation
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' }
                    })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: newUserData,
                        error: null
                    })
                })
            })
        }));

        const result = await updateUser(configWithCreate, 'new@example.com', {
            subscription_status: 'active'
        });

        expect(result).toEqual(newUserData);
    });

    it('handles creation error when createUserIfNotExists is true', async () => {
        const configWithCreate = {
            ...config,
            createUserIfNotExists: true
        };

        // Mock user not found, then failed creation
        mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' }
                    })
                })
            }),
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Creation failed' }
                    })
                })
            })
        }));

        await expect(
            updateUser(configWithCreate, 'new@example.com', {
                subscription_status: 'active'
            })
        ).rejects.toThrow('Failed to create user: Creation failed');
    });

    // Clean up after each test
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });
}); 