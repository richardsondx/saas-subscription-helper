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
}); 