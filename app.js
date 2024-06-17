const express = require("express");
const cors = require("cors");
const session = require("express-session");

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
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use(router);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
