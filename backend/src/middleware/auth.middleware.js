const passport = require('passport');

// Protected route middleware using Passport JWT strategy
exports.requireAuth = passport.authenticate('jwt', { session: false });
