const cors = require("cors");
const express = require("express");
const session = require("express-session");
const { redisClient, RedisStore } = require("./models/redis");

const app = express();

const router = require("./routes");
const passport = require("./config/passport");
const errorHandler = require("./middlewares/errorHandler");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const port = process.env.PORT;

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://voc-memorize-project.onrender.com",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
};

app.set("trust proxy", 1);
app.use(cors(corsOptions));

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use(router);

app.use(errorHandler);

app.listen(port,'0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});
