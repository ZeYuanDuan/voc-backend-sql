const passport = require("../config/passport")

module.exports = passport.authenticate("jwt", { session: false });

// module.exports = (req, res, next) => {
//   if (req.isAuthenticated()) {
//     return next();
//   }
//   res.status(401).json({
//     message: "請先登入",
//   });
// };
