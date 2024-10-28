// middlewares/authMiddleware.js

function isAuthenticated(req, res, next) {
    if (req.session.username) {
        return next(); // User is authenticated, proceed to the next middleware
    } else {
        return res.redirect('/login'); // Redirect to login page if not authenticated
    }
}

module.exports = { isAuthenticated };
