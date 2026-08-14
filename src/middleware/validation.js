const validator = require("validator");

const passwordRules = {
  minLength: (value) => value.length >= 8,
  uppercase: (value) => /[A-Z]/.test(value),
  lowercase: (value) => /[a-z]/.test(value),
  number: (value) => /\d/.test(value),
  special: (value) => /[!@#$%^&*()_+=-]/.test(value),
};

const validatePassword = (password) => {
  const checks = {
    minLength: passwordRules.minLength(password),
    uppercase: passwordRules.uppercase(password),
    lowercase: passwordRules.lowercase(password),
    number: passwordRules.number(password),
    special: passwordRules.special(password),
  };

  const isValid = Object.values(checks).every(Boolean);
  return { isValid, checks };
};

const validateRegisterInput = (body) => {
  const errors = {};
  const { fullName, username, email, phoneNumber, password, confirmPassword } =
    body;

  if (!fullName || fullName.trim().length < 3) {
    errors.fullName = "Full name is required and must be at least 3 characters";
  } else if (
    fullName.trim().length > 50 ||
    !/^[A-Za-z ]+$/.test(fullName.trim())
  ) {
    errors.fullName =
      "Full name must be 3-50 characters and contain letters and spaces only";
  }

  if (!username || username.trim().length < 4) {
    errors.username = "Username must be at least 4 characters";
  } else if (
    username.trim().length > 20 ||
    !/^[a-z0-9_]+$/.test(username.trim())
  ) {
    errors.username =
      "Username can only contain letters, numbers, and underscores";
  }

  if (!email || !validator.isEmail(email)) {
    errors.email = "Please provide a valid email address";
  }

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
    errors.phoneNumber = "Phone number must be exactly 10 digits";
  }

  if (!password) {
    errors.password = "Password is required";
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = "Password does not meet the strength requirements";
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match";
  }

  return { errors };
};

module.exports = { validateRegisterInput, validatePassword };
