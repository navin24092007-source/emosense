import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { User, IUser, UserRole } from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

const generateJWT = (user: IUser): string => {
  const secret = process.env.JWT_SECRET || 'emosense_super_secret_jwt_key_2026';
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    secret,
    { expiresIn: '7d' }
  );
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    let { name, email, googleId, role, token, credential, accessToken } = req.body;

    // If Google ID token is provided
    const idToken = token || credential;
    if (idToken && !email) {
      try {
        const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (response.data && response.data.email) {
          email = response.data.email;
          name = name || response.data.name;
          googleId = googleId || response.data.sub;
        }
      } catch (err: any) {
        console.warn('[Google Auth] tokeninfo verification failed, trying JWT decode:', err.message);
        try {
          const decoded: any = jwt.decode(idToken);
          if (decoded && decoded.email) {
            email = decoded.email;
            name = name || decoded.name;
            googleId = googleId || decoded.sub;
          }
        } catch (decErr) {
          console.error('[Google Auth] JWT decode failed:', decErr);
        }
      }
    }

    // If Google OAuth2 access token is provided
    if (accessToken && !email) {
      try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.data && response.data.email) {
          email = response.data.email;
          name = name || response.data.name;
          googleId = googleId || response.data.sub;
        }
      } catch (err: any) {
        console.error('[Google Auth] userinfo request failed:', err.message);
      }
    }

    if (!email) {
      return res.status(400).json({ message: 'Valid Google email is required' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId: googleId || `google_${Date.now()}`,
        role: role || 'student'
      });
    } else {
      if (googleId && !user.googleId) user.googleId = googleId;
      if (name && (!user.name || user.name.startsWith('Demo'))) user.name = name;
      if (role && user.role !== role) user.role = role;
      await user.save();
    }

    const jwtToken = generateJWT(user);
    return res.json({ token: jwtToken, user });
  } catch (error: any) {
    return res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
};

export const demoLogin = async (req: Request, res: Response) => {
  try {
    const { role, name, email } = req.body;
    const userRole: UserRole = role || 'student';
    const userEmail = email || `demo.${userRole}@emosense.ai`;
    const userName = name || `Demo ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`;

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.create({
        name: userName,
        email: userEmail,
        googleId: `demo_${Date.now()}`,
        role: userRole
      });
    }

    const token = generateJWT(user);
    return res.json({ token, user });
  } catch (error: any) {
    return res.status(500).json({ message: 'Demo login failed', error: error.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, role, autoDeleteDays } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (typeof autoDeleteDays === 'number') user.autoDeleteDays = autoDeleteDays;

    await user.save();
    return res.json({ message: 'Profile updated successfully', user });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};
