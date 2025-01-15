const { mockSupabase } = require('../setup');
const { fetchUser } = require('../../src/supabase');

describe('fetchUser', () => {
    const config = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        table: 'users',
        emailField: 'email',
        debug: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should log debug message when email is missing and debug is true', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        
        await expect(fetchUser(config, null)).rejects.toThrow('Email is required');
        expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Error: Email is required');
    });

    test('should log debug message when no user is found and debug is true', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        
        // Mock Supabase to return no data
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

        const result = await fetchUser(config, 'test@example.com');
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] No user found');
    });

    test('should log debug message when generic error occurs and debug is true', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        
        // Mock Supabase to throw a generic error
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

        await expect(fetchUser(config, 'test@example.com')).rejects.toThrow('Error fetching user: Database error');
        expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Error fetching user:', 'Database error');
    });
}); 