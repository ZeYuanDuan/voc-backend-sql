const db = require("../models/mysql");
const Vocabulary = db.Vocabulary;
const User = db.User;

const passport = require("passport");
const jwt = require("jsonwebtoken");

const {
  verifyRedisDataWithMySQL,
  syncVocabulariesToRedis,
} = require("../middlewares/dataHandler");

const authControllers = {
  postLogin: async (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.error_message });
      }

      try {
        const token = jwt.sign(
          { userId: user.userId },
          process.env.JWT_SECRET,
          { expiresIn: "30d" }
        );
        const { id, name } = await User.findByPk(user.userId);
        const vocStorage = await Vocabulary.count({
          where: { userId: id },
        });

        // await syncVocabulariesToRedis(user.userId); // ! 等 Redis 更新完畢

        res.json({
          message: info.success_message,
          name,
          vocStorage,
          isAuthenticated: true,
          token,
        });
      } catch (err) {
        next(err);
      }
    })(req, res, next);
  },

  getGoogleAuthCallback: async (req, res, next) => {
    passport.authenticate("google", async (err, user, info) => {
      console.log("Google 驗證過程存的東西：", user); // 測試用
      if (err) {
        return next(err);
      }
      try {
        const token = jwt.sign(
          { userId: user.userId },
          process.env.JWT_SECRET,
          { expiresIn: "30d" }
        );
        const { id, name } = await User.findByPk(user.userId);
        const vocStorage = await Vocabulary.count({
          where: { userId: id },
        });

        // await syncVocabulariesToRedis(user.userId); // ! 等 Redis 更新完畢

        res.json({
          message: info.success_message,
          name,
          vocStorage,
          isAuthenticated: true,
          token,
        });
      } catch (err) {
        next(err);
      }
    })(req, res, next);
  },
};

module.exports = authControllers;
