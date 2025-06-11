import type { Request, Response, NextFunction } from "express";
import validator from "validator";
import { HttpError } from "@/utils/HttpError";

import { body, param, query, header, cookie, validationResult } from "express-validator";

type LocationType = "body" | "param" | "query" | "header" | "cookie";

const getValidator = (location: LocationType, field: string) => {
  switch (location) {
    case "param":
      return param(field);
    case "query":
      return query(field);
    case "header":
      return header(field);
    case "cookie":
      return cookie(field);
    case "body":
    default:
      return body(field);
  }
};
export const usernameValidator = (required: boolean = true, location: LocationType = "body") => {
  const validator = getValidator(location, "username").notEmpty().isLength({ min: 3, max: 20 }).withMessage("Username must be between 3 and 20 characters long").trim().escape();
  return required ? validator : validator.optional();
};

export const emailValidator = (required: boolean = true, location: LocationType = "body") => {
  const validator = getValidator(location, "email").trim().normalizeEmail().isEmail().withMessage("Invalid email format");
  return required ? validator : validator.optional();
};

export const passwordValidator = (required: boolean = true, location: LocationType = "body") => {
  const validator = getValidator(location, "password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number");
  return required ? validator : validator.optional();
};

export const firstNameValidator = (required: boolean = true, location: LocationType = "body") => {
  const validator = getValidator(location, "firstName").notEmpty().withMessage("First name is required").trim().escape();
  return required ? validator : validator.optional();
};

export const lastNameValidator = (required: boolean = true, location: LocationType = "body") => {
  const validator = getValidator(location, "lastName").notEmpty().withMessage("Last name is required").trim().escape();
  return required ? validator : validator.optional();
};

export const deviceNameValidatorTest = (required: boolean = true, location: LocationType = "body") => {
  const validator = getValidator(location, "name").isString().withMessage("Device name must be a string").isLength({ min: 1, max: 50 }).withMessage("Device name must be between 1 and 50 characters");
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

export const updateAccountValidators = [usernameValidator(false), emailValidator(false), passwordValidator(false), firstNameValidator(false), lastNameValidator(false), handleValidators];

export const registerValidators = [usernameValidator(), emailValidator(), passwordValidator(), firstNameValidator(), lastNameValidator(), handleValidators];
export const deviceNameValidators = [deviceNameValidatorTest(), handleValidators];
export const loginValidators = [emailValidator(), passwordValidator(), usernameValidator(), handleValidators];
