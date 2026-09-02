import { getAuth } from "firebase/auth";
import app from "./config.js";

const auth = getAuth(app);

export default auth;