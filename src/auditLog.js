import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import auth from "./firebase/auth";
import db from "./firebase/firestore";

// =========================================================
// YAKAP AUDIT LOG MODULE
// FIRESTORE + MYSQL
// =========================================================

console.log("========================================");
console.log("🔥 AUDITLOG.JS LOADED");
console.log("🔥 Audit system is ready.");
console.log("🔥 Firestore + MySQL integration enabled.");
console.log("========================================");

// =========================================================
// MYSQL BACKEND URL
// =========================================================

const MYSQL_API_URL = "http://localhost:5000";

// =========================================================
// GET CURRENT FIREBASE USER
// =========================================================

const getCurrentUserInfo = () => {
  const user = auth.currentUser;

  console.log("AUDIT CURRENT USER:", user);

  if (!user) {
    console.warn(
      "⚠️ AUDIT: No authenticated Firebase user found."
    );

    return {
      uid: null,
      email: "Unknown User",
    };
  }

  return {
    uid: user.uid || null,
    email: user.email || "Unknown User",
  };
};

// =========================================================
// SAVE AUDIT LOG TO MYSQL
// =========================================================

const saveAuditToMySQL = async ({
  action,
  module,
  recordId = null,
  recordName = null,
  details = null,
  userEmail = "Unknown User",
}) => {
  try {
    console.log("========================================");
    console.log("🗄️ MYSQL AUDIT START");
    console.log("========================================");

    console.log("Action:", action);
    console.log("Module:", module);
    console.log("Record ID:", recordId);
    console.log("Record Name:", recordName);
    console.log("Details:", details);
    console.log("User:", userEmail);

    const response = await fetch(
      `${MYSQL_API_URL}/api/audit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: action || "UNKNOWN",
          module: module || "Unknown Module",
          recordId,
          recordName,
          details,
          userEmail,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result?.message ||
          "MySQL audit request failed."
      );
    }

    console.log("========================================");
    console.log("✅ MYSQL AUDIT SUCCESS");
    console.log("Inserted MySQL ID:", result.id);
    console.log("========================================");

    return true;
  } catch (error) {
    console.error("========================================");
    console.error("❌ MYSQL AUDIT ERROR");
    console.error("========================================");
    console.error("Error:", error);
    console.error("Message:", error?.message);
    console.error("========================================");

    // IMPORTANT:
    // MySQL failure will NOT break Firestore audit.
    return false;
  }
};

// =========================================================
// SAVE DELETED RECORD TO MYSQL
// =========================================================

const saveDeletedRecordToMySQL = async ({
  recordId = null,
  recordData = {},
  deletedBy = "Unknown User",
}) => {
  try {
    console.log("========================================");
    console.log("🗄️ MYSQL DELETED RECORD BACKUP START");
    console.log("========================================");

    console.log("Original Record ID:", recordId);
    console.log("Deleted By:", deletedBy);

    const response = await fetch(
      `${MYSQL_API_URL}/api/deleted-record`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalRecordId: recordId,
          deletedBy,
          originalData: recordData || {},
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result?.message ||
          "MySQL deleted record backup failed."
      );
    }

    console.log("========================================");
    console.log("✅ MYSQL DELETED RECORD BACKUP SUCCESS");
    console.log("Inserted MySQL ID:", result.id);
    console.log("========================================");

    return true;
  } catch (error) {
    console.error("========================================");
    console.error(
      "❌ MYSQL DELETED RECORD BACKUP ERROR"
    );
    console.error("========================================");

    console.error("Error:", error);
    console.error("Message:", error?.message);

    console.error("========================================");

    return false;
  }
};

// =========================================================
// CREATE AUDIT LOG
//
// Supported actions:
//
// CREATE
// UPDATE
// DELETE
// BATCH_IMPORT
// BATCH_DELETE
// RESTORE
// =========================================================

export const logAudit = async ({
  action,
  module,
  recordId = null,
  recordName = null,
  details = null,
}) => {
  console.log("========================================");
  console.log("🚨 LOGAUDIT FUNCTION CALLED");
  console.log("========================================");

  console.log("Action:", action);
  console.log("Module:", module);
  console.log("Record ID:", recordId);
  console.log("Record Name:", recordName);
  console.log("Details:", details);

  try {
    // -------------------------------------------------------
    // GET CURRENT USER
    // -------------------------------------------------------

    const currentUser = getCurrentUserInfo();

    console.log(
      "AUDIT USER INFO:",
      currentUser
    );

    // -------------------------------------------------------
    // PREPARE FIRESTORE AUDIT DATA
    // -------------------------------------------------------

    const auditData = {
      action: action || "UNKNOWN",

      module:
        module || "Unknown Module",

      recordId:
        recordId !== undefined
          ? recordId
          : null,

      recordName:
        recordName !== undefined
          ? recordName
          : null,

      details:
        details !== undefined
          ? details
          : null,

      performedBy:
        currentUser.email,

      performedByUid:
        currentUser.uid,

      performedAt:
        serverTimestamp(),
    };

    console.log(
      "FIRESTORE AUDIT DATA:",
      auditData
    );

    // -------------------------------------------------------
    // SAVE TO FIRESTORE
    // -------------------------------------------------------

    console.log(
      "AUDIT: Writing to Firestore auditLogs..."
    );

    const auditCollection =
      collection(
        db,
        "auditLogs"
      );

    const auditRef =
      await addDoc(
        auditCollection,
        auditData
      );

    console.log("========================================");
    console.log(
      "✅ FIRESTORE AUDIT LOG SUCCESS"
    );

    console.log(
      "Audit Document ID:",
      auditRef.id
    );

    console.log(
      "========================================");

    // -------------------------------------------------------
    // SAVE TO MYSQL
    // -------------------------------------------------------

    await saveAuditToMySQL({
      action,
      module,
      recordId,
      recordName,
      details,
      userEmail:
        currentUser.email,
    });

    // -------------------------------------------------------
    // FINAL RESULT
    // -------------------------------------------------------

    console.log("========================================");
    console.log(
      "✅ AUDIT PROCESS COMPLETED"
    );
    console.log("========================================");

    return true;

  } catch (error) {
    console.error("========================================");
    console.error(
      "❌ FIRESTORE AUDIT LOG ERROR"
    );
    console.error("========================================");

    console.error(
      "Error:",
      error
    );

    console.error(
      "Error Code:",
      error?.code
    );

    console.error(
      "Error Message:",
      error?.message
    );

    console.error("========================================");

    return false;
  }
};

// =========================================================
// BACKUP DELETED RECORD
//
// Saves the complete record before permanent deletion.
//
// Firestore:
// deletedRecords
//
// MySQL:
// deleted_records
// =========================================================

export const backupDeletedRecord = async ({
  collectionName,
  recordId,
  recordData,
  module,
}) => {
  console.log("========================================");
  console.log(
    "🚨 DELETED RECORD BACKUP START"
  );
  console.log("========================================");

  console.log(
    "Collection:",
    collectionName
  );

  console.log(
    "Record ID:",
    recordId
  );

  console.log(
    "Module:",
    module
  );

  try {
    // -------------------------------------------------------
    // GET CURRENT USER
    // -------------------------------------------------------

    const currentUser =
      getCurrentUserInfo();

    console.log(
      "DELETED RECORD USER INFO:",
      currentUser
    );

    // -------------------------------------------------------
    // PREPARE FIRESTORE BACKUP
    // -------------------------------------------------------

    const deletedData = {
      originalCollection:
        collectionName || null,

      originalRecordId:
        recordId || null,

      module:
        module || "Unknown Module",

      originalData:
        recordData || {},

      deletedBy:
        currentUser.email,

      deletedByUid:
        currentUser.uid,

      deletedAt:
        serverTimestamp(),

      restored: false,

      restoredBy: null,

      restoredByUid: null,

      restoredAt: null,
    };

    console.log(
      "FIRESTORE DELETED RECORD DATA:",
      deletedData
    );

    // -------------------------------------------------------
    // SAVE BACKUP TO FIRESTORE
    // -------------------------------------------------------

    console.log(
      "DELETED RECORD: Writing to Firestore..."
    );

    const deletedCollection =
      collection(
        db,
        "deletedRecords"
      );

    const deletedRef =
      await addDoc(
        deletedCollection,
        deletedData
      );

    console.log("========================================");
    console.log(
      "✅ FIRESTORE DELETED RECORD BACKUP SUCCESS"
    );

    console.log(
      "Backup Document ID:",
      deletedRef.id
    );

    console.log(
      "========================================");

    // -------------------------------------------------------
    // SAVE BACKUP TO MYSQL
    // -------------------------------------------------------

    const mysqlBackupSuccess =
      await saveDeletedRecordToMySQL({
        recordId,
        recordData,
        deletedBy:
          currentUser.email,
      });

    // -------------------------------------------------------
    // IMPORTANT SAFETY CHECK
    // -------------------------------------------------------
    //
    // If MySQL backup fails, we return false.
    //
    // This prevents IcareRegistration.jsx from
    // permanently deleting the Firebase record when
    // the MySQL backup did not succeed.
    //

    if (!mysqlBackupSuccess) {
      console.error("========================================");
      console.error(
        "⚠️ MYSQL BACKUP FAILED"
      );

      console.error(
        "⚠️ FIRESTORE BACKUP EXISTS"
      );

      console.error(
        "⚠️ DELETE OPERATION SHOULD BE STOPPED"
      );

      console.error("========================================");

      return false;
    }

    // -------------------------------------------------------
    // FINAL SUCCESS
    // -------------------------------------------------------

    console.log("========================================");
    console.log(
      "✅ DELETED RECORD BACKUP COMPLETED"
    );

    console.log(
      "✅ FIRESTORE BACKUP: SUCCESS"
    );

    console.log(
      "✅ MYSQL BACKUP: SUCCESS"
    );

    console.log("========================================");

    return true;

  } catch (error) {
    console.error("========================================");
    console.error(
      "❌ DELETED RECORD BACKUP ERROR"
    );
    console.error("========================================");

    console.error(
      "Error:",
      error
    );

    console.error(
      "Error Code:",
      error?.code
    );

    console.error(
      "Error Message:",
      error?.message
    );

    console.error("========================================");

    return false;
  }
};

// =========================================================
// RESTORE AUDIT HELPER
//
// This creates audit history.
// Actual Firestore restoration will be handled
// by the Deleted Records feature.
// =========================================================

export const logRestoreAudit = async ({
  recordId = null,
  recordName = null,
  details = null,
}) => {
  return await logAudit({
    action: "RESTORE",

    module:
      "ICARE Registration",

    recordId,

    recordName,

    details:
      details ||
      "Deleted patient record restored.",
  });
};

// =========================================================
// DEFAULT EXPORT
// =========================================================

export default {
  logAudit,
  backupDeletedRecord,
  logRestoreAudit,
};

