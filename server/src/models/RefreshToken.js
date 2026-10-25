const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      index: true
    },
    family: {
      type: String,
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index in MongoDB
    },
    revokedAt: {
      type: Date,
      default: null
    },
    userAgent: {
      type: String,
      default: ''
    },
    ip: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

refreshTokenSchema.methods.isExpired = function () {
  return Date.now() >= this.expiresAt.getTime();
};

refreshTokenSchema.methods.isRevoked = function () {
  return this.revokedAt !== null;
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
