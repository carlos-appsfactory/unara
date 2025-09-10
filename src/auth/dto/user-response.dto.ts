export class UserResponseDto {
  id: string;
  email: string;
  username: string;
  email_verified: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(user: any): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      username: user.username,
      email_verified: user.email_verified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
