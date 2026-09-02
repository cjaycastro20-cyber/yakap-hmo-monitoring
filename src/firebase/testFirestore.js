import { collection, getDocs } from "firebase/firestore";
import db from "./firebase/firestore";

const testFirestore = async () => {
  try {
    const snapshot = await getDocs(collection(db, "icare"));

    snapshot.forEach((doc) => {
      console.log("ICARE DATA:", doc.id, doc.data());
    });
  } catch (error) {
    console.error("Firestore Error:", error);
  }
};

testFirestore();