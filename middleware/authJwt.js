import jwt from "jsonwebtoken";
import { db } from "../models/index.js";
import { _config } from "../config/global.config.js";
const User = db.user;
const Role = db.role;

const { TokenExpiredError } = jwt;
const ROLES = ["admin", "moderator"];

const catchError = (err, res) => {
  if (err instanceof TokenExpiredError) {
    return res.status(401).send({ message: "Unauthorized! Access Token has expired" });
  }
  return res.status(401).send({ message: "Unauthorized" });
};

const verifyToken = async (req, res, next) => {
  let token = req.headers["x-access-token"];
  if (!token) {
    return res.status(403).send({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, _config.jwt_secret);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return catchError(err, res);
  }
};

const checkRole = async (req, res, next, role) => {
  try {
    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(500).send({ message: "User not found" });
    }
    const roleData = await Role.findOne({ name: role }).exec();
    if (!roleData) {
      return res.status(500).send({ message: `${role} role not found` });
    }
    if (!user.roles.includes(roleData._id)) {
      return res.status(403).send({ message: `Require ${role} Role` });
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

const isAdmin = (req, res, next) => checkRole(req, res, next, "admin");
const isModerator = (req, res, next) => checkRole(req, res, next, "moderator");

const isAdminOrModerator = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(500).send({ message: "User not found!" });
    }
    const roles = await Role.find({ name: { $in: ROLES } }).exec();
    const userRoles = user.roles.map((role) => role.toString());
    const authorizedRoles = roles.map((role) => role._id.toString());
    const isAuthorized = authorizedRoles.some((role) =>
      userRoles.includes(role)
    );
    if (!isAuthorized) {
      return res
        .status(403)
        .send({ message: "Require Admin or Moderator Role!" });
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isModerator,
  isAdminOrModerator
};

export default authJwt;