import validator from "validator";
import { body, param, query, header, cookie, type ValidationChain } from "express-validator";
import { Command } from "@/types/types";

// === Types ===
type LocationType = "body" | "param" | "query" | "header" | "cookie";

type ValidationFn = (required: boolean, location: LocationType) => ValidationChain;

type ValidatorOptions = {
  required?: boolean;
  location?: LocationType;
};

export type RequiredFields = {
  email?: boolean;
  username?: boolean;
  password?: boolean;
  firstName?: boolean;
  lastName?: boolean;
  deviceName?: boolean;
  command?: boolean;
};

type GeneratorField = Partial<Record<keyof RequiredFields, boolean | ValidatorOptions>>;

// === Validator Factory Helper ===
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

// === Field Validators ===
export const usernameValidator: ValidationFn = (required, location) => {
  const chain = getValidator(location, "username").notEmpty().withMessage("Username is required").isLength({ min: 3, max: 20 }).withMessage("Username must be between 3 and 20 characters long").trim().escape();

  return required ? chain : chain.optional();
};

export const emailValidator: ValidationFn = (required, location) => {
  const chain = getValidator(location, "email").trim().normalizeEmail().isEmail().withMessage("Invalid email format");

  return required ? chain : chain.optional();
};

export const passwordValidator: ValidationFn = (required, location) => {
  const chain = getValidator(location, "password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number");

  return required ? chain : chain.optional();
};

export const firstNameValidator: ValidationFn = (required, location) => {
  const chain = getValidator(location, "firstName").notEmpty().withMessage("First name is required").trim().escape();

  return required ? chain : chain.optional();
};

export const lastNameValidator: ValidationFn = (required, location) => {
  const chain = getValidator(location, "lastName").notEmpty().withMessage("Last name is required").trim().escape();

  return required ? chain : chain.optional();
};

export const deviceNameValidator: ValidationFn = (required, location) => {
  const chain = getValidator(location, "name").isString().withMessage("Device name must be a string").isLength({ min: 1, max: 50 }).withMessage("Device name must be between 1 and 50 characters");

  return required ? chain : chain.optional();
};

export const commandValidator: ValidationFn = (required, location) => {
  const validCommand = Object.values(Command);
  const chain = getValidator(location, "command").notEmpty().withMessage("Command is required").isString().withMessage("Command must be a string").isIn(validCommand);

  return required ? chain : chain.optional();
};

// === Validator Dispatcher Map ===
const validatorMap: Record<keyof RequiredFields, ValidationFn> = {
  email: emailValidator,
  username: usernameValidator,
  password: passwordValidator,
  firstName: firstNameValidator,
  lastName: lastNameValidator,
  deviceName: deviceNameValidator,
  command: commandValidator,
};

// === Generator ===
export const generateValidators = (fields: GeneratorField): ValidationChain[] => {
  return Object.entries(fields)
    .filter(([_, value]) => value !== false)
    .map(([field, options]) => {
      if (typeof options === "object" && options !== null) {
        const { required = true, location = "body" } = options;
        return validatorMap[field as keyof RequiredFields](required, location);
      }
      return validatorMap[field as keyof RequiredFields](true, "body");
    });
};

// === Preset Validators ===
export const registerValidators = (): ValidationChain[] =>
  generateValidators({
    email: { required: true },
    username: { required: true },
    password: { required: true },
    firstName: { required: true },
    lastName: { required: true },
  });

export const updateAccountValidators = (): ValidationChain[] =>
  generateValidators({
    email: { required: false },
    username: { required: false },
    password: { required: false },
    firstName: { required: false },
    lastName: { required: false },
  });

export const loginValidators = (requiredFields: RequiredFields): ValidationChain[] => {
  const baseFields: GeneratorField = {
    email: requiredFields.email ? { required: true } : false,
    username: requiredFields.username ? { required: true } : false,
    password: { required: true },
  };

  return generateValidators(baseFields);
};

export const commandValidators = (): ValidationChain[] => {
  const baseFields: GeneratorField = {
    command: { required: true },
  };
  return generateValidators(baseFields);
};

// === Utility Functions ===
export const sanitizeEmail = (email: string): string => validator.normalizeEmail(email) || "";

export const sanitizeUsername = (username: string): string => validator.escape(username.trim());

export const sanitizeString = (input: string): string => validator.escape(input.trim());

export const isValidEmail = (email: string): boolean => validator.isEmail(email);

export const isStrongPassword = (password: string): boolean =>
  validator.isStrongPassword(password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 0,
    minNumbers: 1,
    minSymbols: 0,
  });
