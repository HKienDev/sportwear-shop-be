import { OAuth2Client } from 'google-auth-library';

// Khởi tạo OAuth2Client với client ID và client secret từ biến môi trường
export const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Tạo URL đăng nhập Google
export const getGoogleAuthURL = () => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });
};

// Lấy thông tin người dùng từ token
export const getGoogleUser = async (code) => {
  try {
    // Lấy tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Lấy thông tin người dùng
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const data = await response.json();

    return {
      email: data.email,
      fullName: data.name,
      avatar: data.picture,
      googleId: data.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    };
  } catch (error) {
    console.error('Get Google user error:', error);
    throw error;
  }
};

// Verify Google ID token
export const verifyGoogleToken = async (token) => {
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    return {
      email: payload.email,
      fullName: payload.name,
      avatar: payload.picture,
      googleId: payload.sub
    };
  } catch (error) {
    console.error('Verify Google token error:', error);
    throw error;
  }
}; 