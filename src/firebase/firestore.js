import { getFirestore } from "firebase/firestore";
import app from "./config.js";

const db = getFirestore(app);

export default db;