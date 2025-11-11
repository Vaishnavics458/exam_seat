const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const db = require('../models/db');
const User = require('../models/userModel');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, roll_number: user.roll_number },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { role, email, roll_number, password } = req.body;

    let user;
    if (role === 'student') user = await User.findByRoll(roll_number);
    else user = await User.findByEmail(email);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/auth/register (admin only)
exports.register = async (req, res) => {
  try {
    const { name, email, roll_number, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const newUser = await User.createUser({ name, email, roll_number, password_hash: hash, role });
    res.status(201).json(newUser);
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
