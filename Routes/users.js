const router = require("express").Router();
const jwt = require("jsonwebtoken");

const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const userData = require("../Models/user");

const auth = require("../Middleware/Auth");

// signup
router.post(
  "/signup",
  [
    // Validation rules matching your frontend criteria
    check("name")
      .isLength({ min: 2, max: 25 })
      .withMessage("Name must be between 2 and 25 characters"),
    check("email").isEmail().withMessage("Invalid email address"),
    check("phone")
      .matches(/^(\d{3}[-. ]?\d{3}[-. ]?\d{4}|\d{10})$/)
      .withMessage("Invalid phone number format"),
    check("password")
      .matches(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{};:,<.>]).{8,32}$/
      )
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character and be between 8 and 32 characters long"
      ),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const existingUser = await userData.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(409).json({
          error: "Username already exists",
          message:
            "The requested username is already taken. Please choose a different one.",
        });
      }
      // console.log(req.body);
      const password = req.body.password;

      bcrypt
        .hash(password, saltRounds)
        .then(function (hash) {
          req.body.password = hash;

          const newUser = userData(req.body);
          newUser.save();
          res.status(200).json({ message: "Account created successfully" });
        })
        .catch((err) => {
          console.log("Hash not generated");
        });
    } catch (error) {
      res.status(500).json({ message: "Unable create account" });
    }
  }
);

// login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  // console.log(password);
  let user = await userData.findOne({ email: email });

  if (!user) res.json({ message: "User not found" });
  // console.log(user);
  try {
    bcrypt.compare(password, user.password).then(function (result) {
      // result == true
      if (result) {
        jwt.sign(
          { email: user.email, id: user._id, role: user.role },
          "AwesomeMovies",
          { expiresIn: "1d" },
          (err, token) => {
            if (err) {
              res.json({ message: "token not generated" });
            } else {
              res.json({
                message: "Login Successfully",
                token: token,
                data: user,
              });
            }
          }
        );
      } else {
        res.json({ message: "Login failed" });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

// get details of a user
router.get("/userlist/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Admin" || req.body.role === "Customer") {
      const { id } = req.params;
      console.log("id :", id);
      let user = await userData.findById(id);
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).json({ message: "Unable to find" });
      }
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    res.json({ message: "unable to find", err: error.message });
  }
});

// checking enterd password is correct
router.post("/oldpassword", auth, async (req, res) => {
  if (req.body.role === "Admin" || req.body.role === "Customer") {
    const { username, password } = req.body;
    let user = await userData.findOne({ email: username });
    try {
      bcrypt.compare(password, user.password).then((result) => {
        if (result) {
          res.status(200).json({ message: "Correct Password" });
        } else {
          res.status(400).json({ message: "Incorrect Password" });
        }
      });
    } catch (error) {
      console.log(error.message);
      res.json({ message: "Incorrect Password" });
    }
  } else {
    res.status(401).json({ message: "Access denied" });
  }
});

// upadting new password
router.put("/updatepassword/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Admin" || req.body.role === "Customer") {
      const { id } = req.params;
      console.log(req.body);
      bcrypt
        .hash(req.body.password, saltRounds)
        .then(function (hash) {
          // req.body.password = hash;
          userData.findByIdAndUpdate(id, { $set: { password: hash } }).exec();
          res.status(200).json({ message: "Password updated Successfully" });
        })
        .catch((err) => {
          console.log("Hash not generated");
        });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    res.status(500).json({ message: "unable to update", err: error.message });
  }
});

module.exports = router;
