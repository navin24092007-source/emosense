import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { User, IUser, UserRole } from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

const ADMIN_PASSWORD = 'emosense@123';

const generateJWT = (user: IUser): string => {
  const secret = process.env.JWT_SECRET || 'emosense_super_secret_jwt_key_2026';
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    secret,
    { expiresIn: '7d' }
  );
};

/* ─────────────────────────────────────────────
   POST /auth/register
   Creates a new user account with hashed password,
   saves it to MongoDB and returns JWT.
───────────────────────────────────────────── */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role || 'student'
    });

    const token = generateJWT(user);
    // Strip password from response
    const userObj = user.toObject() as any;
    delete userObj.password;

    console.log(`[Auth] New user registered: ${user.email} (${user.role})`);
    return res.status(201).json({ token, user: userObj, message: 'Account created successfully.' });
  } catch (error: any) {
    console.error('[Auth] Register error:', error.message);
    return res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
};

/* ─────────────────────────────────────────────
   POST /auth/login
   Validates email + password against MongoDB.
   Admin bypass: any email + 'emosense@123'
───────────────────────────────────────────── */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    /* Admin bypass */
    if (password === ADMIN_PASSWORD) {
      const adminEmail = email.trim().toLowerCase();
      const hashedAdminPwd = await bcrypt.hash(ADMIN_PASSWORD, 10);

      let adminUser = await User.findOne({ email: adminEmail });
      if (!adminUser) {
        adminUser = await User.create({
          name: 'System Administrator',
          email: adminEmail,
          role: 'admin' as const,
          password: hashedAdminPwd
        });
      } else {
        // Ensure they have admin role
        adminUser.role = 'admin';
        adminUser.name = adminUser.name || 'System Administrator';
        await adminUser.save();
      }
      const token = generateJWT(adminUser);
      const userObj = adminUser.toObject() as any;
      delete userObj.password;
      console.log(`[Auth] Admin login: ${adminUser.email}`);
      return res.json({ token, user: userObj });
    }

    /* Normal user login */
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'No account found with this email. Please register first.' });
    }
    if (!user.password) {
      return res.status(401).json({ message: 'This account uses Google Sign-In. Please use the Google button.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = generateJWT(user);
    const userObj = user.toObject() as any;
    delete userObj.password;

    console.log(`[Auth] User signed in: ${user.email} (${user.role})`);
    return res.json({ token, user: userObj });
  } catch (error: any) {
    console.error('[Auth] Login error:', error.message);
    return res.status(500).json({ message: 'Sign-in failed.', error: error.message });
  }
};

/* ─────────────────────────────────────────────
   POST /auth/google  (unchanged, kept as-is)
───────────────────────────────────────────── */
export const googleAuth = async (req: Request, res: Response) => {
  try {
    let { name, email, googleId, role, token, credential, accessToken } = req.body;

    const idToken = token || credential;
    if (idToken && !email) {
      try {
        const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (response.data?.email) {
          email = response.data.email;
          name = name || response.data.name;
          googleId = googleId || response.data.sub;
        }
      } catch (err: any) {
        try {
          const decoded: any = jwt.decode(idToken);
          if (decoded?.email) { email = decoded.email; name = name || decoded.name; googleId = googleId || decoded.sub; }
        } catch { /* silent */ }
      }
    }

    if (accessToken && !email) {
      try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.data?.email) { email = response.data.email; name = name || response.data.name; googleId = googleId || response.data.sub; }
      } catch (err: any) { console.error('[Google Auth] userinfo failed:', err.message); }
    }

    if (!email) return res.status(400).json({ message: 'Valid Google email is required' });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name: name || email.split('@')[0], email, googleId: googleId || `google_${Date.now()}`, role: role || 'student' });
    } else {
      if (googleId && !user.googleId) user.googleId = googleId;
      if (name && (!user.name || user.name.startsWith('Demo'))) user.name = name;
      if (role && user.role !== role) user.role = role;
      await user.save();
    }

    const jwtToken = generateJWT(user);
    const userObj = user.toObject() as any;
    delete userObj.password;
    return res.json({ token: jwtToken, user: userObj });
  } catch (error: any) {
    return res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
};

/* ─────────────────────────────────────────────
   POST /auth/demo  (kept as legacy fallback)
───────────────────────────────────────────── */
export const demoLogin = async (req: Request, res: Response) => {
  try {
    const { role, name, email } = req.body;
    const userRole: UserRole = role || 'student';
    const userEmail = email || `demo.${userRole}@emosense.ai`;
    const userName = name || `Demo ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`;

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.create({ name: userName, email: userEmail, googleId: `demo_${Date.now()}`, role: userRole });
    }

    const token = generateJWT(user);
    const userObj = user.toObject() as any;
    delete userObj.password;
    return res.json({ token, user: userObj });
  } catch (error: any) {
    return res.status(500).json({ message: 'Demo login failed', error: error.message });
  }
};

/* ── profile endpoints ── */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const userObj = user.toObject() as any;
    delete userObj.password;
    return res.json(userObj);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, autoDeleteDays } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name) user.name = name;
    
    // Security Fix: Users cannot change their own roles via the profile endpoint
    
    if (typeof autoDeleteDays === 'number') user.autoDeleteDays = autoDeleteDays;
    await user.save();
    const userObj = user.toObject() as any;
    delete userObj.password;
    return res.json({ message: 'Profile updated successfully', user: userObj });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};
