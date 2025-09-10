export interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  tokenId: string; // Unique token identifier for rotation
  iat?: number;
  exp?: number;
}