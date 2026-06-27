const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }, // bcrypt
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ['hr'], default: 'hr' }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
