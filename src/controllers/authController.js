const bcrypt = require("bcryptjs");
const {
  validateRegisterInput,
  validatePassword,
} = require("../middleware/validation");
const detailsDb = require("../db/detailsDb");

const registerUser = async (req, res) => {
  try {
    const { errors } = validateRegisterInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const {
      fullName,
      username,
      email,
      phoneNumber,
      password,
      confirmPassword,
    } = req.body;

    if (confirmPassword !== password) {
      return res
        .status(400)
        .json({
          success: false,
          errors: { confirmPassword: "Passwords do not match" },
        });
    }

    // Check for existing user in SQLite details.db
    const existingByUsername = detailsDb.findUserByUsername(username);
    if (existingByUsername) {
      return res
        .status(409)
        .json({
          success: false,
          errors: { username: "Username already taken" },
        });
    }

    const existingByEmail = detailsDb.findUserByEmail(email);
    if (existingByEmail) {
      return res
        .status(409)
        .json({ success: false, errors: { email: "Email already exists" } });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save to SQLite details.db
    const userId = detailsDb.createUser({
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: userId,
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Database failure. Please try again." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Username/email and password are required.",
        });
    }

    // Look up user in SQLite details.db
    const user = detailsDb.findUserByUsernameOrEmail(usernameOrEmail);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid username/email or password." });
    }

    const isMatch = await detailsDb.verifyPassword(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid username/email or password." });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Database failure. Please try again." });
  }
};

const getProfile = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

module.exports = { registerUser, loginUser, getProfile };
