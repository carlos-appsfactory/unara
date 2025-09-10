import { UserResponseDto } from './user-response.dto';

describe('UserResponseDto', () => {
  describe('constructor', () => {
    it('should create instance with provided partial data', () => {
      const partialData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
      };

      const dto = new UserResponseDto(partialData);

      expect(dto.id).toBe(partialData.id);
      expect(dto.email).toBe(partialData.email);
      expect(dto.username).toBe(partialData.username);
    });
  });

  describe('fromEntity', () => {
    it('should create UserResponseDto from user entity', () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password_should_not_be_included',
        fullname: 'Test User',
        profile_picture: 'https://example.com/avatar.jpg',
        email_verified: false,
        last_login: new Date('2024-01-15T10:30:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T12:00:00Z'),
      };

      const dto = UserResponseDto.fromEntity(mockUser);

      expect(dto.id).toBe(mockUser.id);
      expect(dto.email).toBe(mockUser.email);
      expect(dto.username).toBe(mockUser.username);
      expect(dto.email_verified).toBe(mockUser.email_verified);
      expect(dto.createdAt).toBe(mockUser.createdAt);
      expect(dto.updatedAt).toBe(mockUser.updatedAt);

      // Ensure sensitive data is not included
      expect((dto as any).password_hash).toBeUndefined();
      expect((dto as any).fullname).toBeUndefined();
      expect((dto as any).profile_picture).toBeUndefined();
      expect((dto as any).last_login).toBeUndefined();
    });

    it('should handle partial user entity data', () => {
      const partialUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        email_verified: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T12:00:00Z'),
      };

      const dto = UserResponseDto.fromEntity(partialUser);

      expect(dto.id).toBe(partialUser.id);
      expect(dto.email).toBe(partialUser.email);
      expect(dto.username).toBe(partialUser.username);
      expect(dto.email_verified).toBe(partialUser.email_verified);
      expect(dto.createdAt).toBe(partialUser.createdAt);
      expect(dto.updatedAt).toBe(partialUser.updatedAt);
    });
  });

  describe('data safety', () => {
    it('should not expose password_hash field', () => {
      const dto = new UserResponseDto({
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        email_verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const keys = Object.keys(dto);
      expect(keys).not.toContain('password_hash');
      expect(keys).not.toContain('password');
    });

    it('should only include safe user fields', () => {
      const dto = new UserResponseDto({
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        email_verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const expectedFields = [
        'id',
        'email',
        'username',
        'email_verified',
        'createdAt',
        'updatedAt',
      ];
      const actualFields = Object.keys(dto);

      expectedFields.forEach((field) => {
        expect(actualFields).toContain(field);
      });

      // Ensure no unexpected fields are present
      expect(actualFields.length).toBe(expectedFields.length);
    });
  });
});
