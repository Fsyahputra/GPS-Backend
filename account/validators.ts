import { body, validationResult } from "express-validator";
import type { Request, Response, NextFunction } from "express";
import validator from "validator";
import { HttpError } from "@/utils/HttpError";

export const usernameValidator = (required: boolean = true) => {
  const validator = body("username").notEmpty().isLength({ min: 3, max: 20 }).withMessage("Username must be between 3 and 20 characters long").trim().escape();
  return required ? validator : validator.optional();
};

export const emailValidator = (required: boolean = true) => {
  const validator = body("email").trim().normalizeEmail().isEmail().withMessage("Invalid email format");
  return required ? validator : validator.optional();
};

export const passwordValidator = (required: boolean = true) => {
  const validator = body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number");
  return required ? validator : validator.optional();
};

export const firstNameValidator = (required: boolean = true) => {
  const validator = body("firstName").notEmpty().withMessage("First name is required").trim().escape();
  return required ? validator : validator.optional();
};

export const lastNameValidator = (required: boolean = true) => {
  const validator = body("lastName").notEmpty().withMessage("Last name is required").trim().escape();
  return required ? validator : validator.optional();
};

export const handleValidators = (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors
        .array()
        .map((err) => err.msg)
        .join(", ");
      throw new HttpError(`${errorMessages}`, 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const sanitizeEmail = (email: string) => validator.normalizeEmail(email) || "";

export const sanitizeUsername = (username: string) => validator.escape(username.trim());

export const sanitizeString = (input: string) => validator.escape(input.trim());

export const isValidEmail = (email: string) => validator.isEmail(email);

export const isStrongPassword = (password: string) =>
  validator.isStrongPassword(password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 0,
    minNumbers: 1,
    minSymbols: 0,
  });
