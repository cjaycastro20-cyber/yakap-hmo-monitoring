import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "20mb",
  })
);

// ============================================================
// MYSQL CONNECTION
// ============================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database:
    process.env.DB_NAME || "yakap_monitoring",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  timezone: "local",
});

// ============================================================
// HELPERS
// ============================================================

const clean = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text = String(value).trim();

  return text === "" ? null : text;
};

const cleanDate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {
    return text;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const patientSelect = `
  SELECT
    id,
    philhealth_no,
    last_name,
    first_name,
    middle_name,
    DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS date_of_birth,
    address,
    age,
    pcu,
    registration_status,
    DATE_FORMAT(date_registered, '%Y-%m-%d') AS date_registered,
    company,
    patient_no,
    contact_no,
    DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date,
    sex,
    fpe_status,
    remarks,
    source,
    firebase_id,
    teleconsult_status,
    medicine_delivery,
    batch_id,
    batch_file_name,
    DATE_FORMAT(batch_uploaded_at, '%Y-%m-%d %H:%i:%s') AS batch_uploaded_at,
    created_at,
    updated_at
  FROM patients
`;

const normalizePatient = (row) => {
  if (!row) {
    return null;
  }

  const compatibleId =
    row.firebase_id ||
    String(row.id);

  return {
    id: compatibleId,

    mysqlId: row.id,

    company:
      row.company || "",

    no:
      row.patient_no || "",

    philhealthNo:
      row.philhealth_no || "",

    lastName:
      row.last_name || "",

    firstName:
      row.first_name || "",

    middleName:
      row.middle_name || "",

    dateOfBirth:
      row.date_of_birth || "",

    address:
      row.address || "",

    age:
      row.age ?? "",

    contactNumber:
      row.contact_no || "",

    pcu:
      row.pcu || "",

    registrationStatus:
      row.registration_status ||
      "PENDING",

    dateRegistered:
      row.date_registered || "",

    fpe:
      row.fpe_status || "",

    remarks:
      row.remarks || "",

    source:
      row.source || "",

    firebaseId:
      row.firebase_id || null,

    teleconsultStatus:
      row.teleconsult_status || "",

    medicineDelivery:
      row.medicine_delivery || "",

    batchId:
      row.batch_id || null,

    batchFileName:
      row.batch_file_name || null,

    batchUploadedAt:
      row.batch_uploaded_at || null,

    createdAt:
      row.created_at || null,

    updatedAt:
      row.updated_at || null,
  };
};

// ============================================================
// RESOLVE PATIENT ID
// Supports:
//   1
//   123
//   icare-xxxxxxxx
// ============================================================

const resolvePatientId = async (
  connection,
  suppliedId
) => {
  const value = String(
    suppliedId ?? ""
  ).trim();

  if (!value) {
    return null;
  }

  if (/^\d+$/.test(value)) {
    const numericId = Number(value);

    const [rows] =
      await connection.execute(
        `
        SELECT id
        FROM patients
        WHERE id = ?
        LIMIT 1
        `,
        [numericId]
      );

    if (rows.length > 0) {
      return rows[0].id;
    }
  }

  const [firebaseRows] =
    await connection.execute(
      `
      SELECT id
      FROM patients
      WHERE firebase_id = ?
      LIMIT 1
      `,
      [value]
    );

  if (firebaseRows.length > 0) {
    return firebaseRows[0].id;
  }

  return null;
};

// ============================================================
// TEST DATABASE
// ============================================================

const testDatabaseConnection =
  async () => {
    try {
      const connection =
        await pool.getConnection();

      console.log(
        "========================================"
      );
      console.log(
        "✅ MYSQL CONNECTION SUCCESS"
      );
      console.log(
        "========================================"
      );

      console.log(
        "Database:",
        process.env.DB_NAME ||
          "yakap_monitoring"
      );

      console.log(
        "Host:",
        process.env.DB_HOST ||
          "localhost"
      );

      console.log(
        "Port:",
        process.env.DB_PORT ||
          3306
      );

      console.log(
        "========================================"
      );

      connection.release();

      return true;
    } catch (error) {
      console.error(
        "========================================"
      );

      console.error(
        "❌ MYSQL CONNECTION FAILED"
      );

      console.error(
        "========================================"
      );

      console.error(
        "Error Code:",
        error.code
      );

      console.error(
        "Error Message:",
        error.message
      );

      console.error(
        "========================================"
      );

      return false;
    }
  };

// ============================================================
// ENSURE SUPPORTING TABLES
// ============================================================

const ensureSupportingTables =
  async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS icare_batches (
          id VARCHAR(255) NOT NULL,
          file_name VARCHAR(500) NOT NULL,
          batch_id VARCHAR(255) NOT NULL,
          patient_count INT NOT NULL DEFAULT 0,
          uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          source VARCHAR(50) DEFAULT 'batch-upload',
          uploaded_by VARCHAR(255) DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uk_icare_batches_batch_id (batch_id),
          INDEX idx_icare_batches_uploaded_at (uploaded_at)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS yakap_companies (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uk_yakap_companies_name (name)
        )
      `);

      console.log(
        "✅ SUPPORTING TABLES READY"
      );
    } catch (error) {
      console.error(
        "❌ SUPPORTING TABLE ERROR:",
        error.message
      );
    }
  };

// ============================================================
// ROOT
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "YAKAP Monitoring System API is running.",
  });
});

// ============================================================
// HEALTH
// ============================================================

app.get(
  "/api/health",
  async (req, res) => {
    try {
      const [rows] =
        await pool.query(
          "SELECT 1 AS connected"
        );

      res.json({
        success: true,
        message:
          "API and MySQL are connected.",
        database:
          process.env.DB_NAME ||
          "yakap_monitoring",
        mysql:
          rows[0]?.connected === 1,
      });
    } catch (error) {
      console.error(
        "HEALTH CHECK ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "MySQL connection failed.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// AUDIT LOG
// ============================================================

app.post(
  "/api/audit",
  async (req, res) => {
    try {
      const {
        action,
        recordId = null,
        userEmail =
          "Unknown User",
      } = req.body || {};

      if (!action) {
        return res.status(400).json({
          success: false,
          message:
            "Audit action is required.",
        });
      }

      const [result] =
        await pool.execute(
          `
          INSERT INTO audit_logs
          (
            action,
            record_id,
            user_email,
            created_at
          )
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `,
          [
            action,
            recordId === null
              ? null
              : String(recordId),
            userEmail,
          ]
        );

      res.status(201).json({
        success: true,
        message:
          "Audit log saved successfully.",
        id: result.insertId,
      });
    } catch (error) {
      console.error(
        "AUDIT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to save audit log.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET AUDIT
// ============================================================

app.get(
  "/api/audit",
  async (req, res) => {
    try {
      let limit = Number(
        req.query.limit || 100
      );

      if (
        !Number.isInteger(limit) ||
        limit <= 0
      ) {
        limit = 100;
      }

      if (limit > 500) {
        limit = 500;
      }

      const [rows] =
        await pool.query(
          `
          SELECT
            id,
            action,
            record_id,
            user_email,
            created_at
          FROM audit_logs
          ORDER BY created_at DESC
          LIMIT ${limit}
          `
        );

      res.json({
        success: true,
        count: rows.length,
        data: rows,
      });
    } catch (error) {
      console.error(
        "GET AUDIT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve audit logs.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// DELETED RECORD BACKUP
// ============================================================

app.post(
  "/api/deleted-record",
  async (req, res) => {
    try {
      const {
        originalRecordId = null,
        deletedBy =
          "Unknown User",
        originalData = {},
      } = req.body || {};

      if (
        !originalData ||
        typeof originalData !==
          "object"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "originalData must be an object.",
        });
      }

      const [result] =
        await pool.execute(
          `
          INSERT INTO deleted_records
          (
            original_record_id,
            deleted_by,
            original_data,
            deleted_at
          )
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `,
          [
            originalRecordId ===
            null
              ? null
              : String(
                  originalRecordId
                ),
            deletedBy,
            JSON.stringify(
              originalData
            ),
          ]
        );

      res.status(201).json({
        success: true,
        message:
          "Deleted record backed up successfully.",
        id: result.insertId,
      });
    } catch (error) {
      console.error(
        "DELETED BACKUP ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to backup deleted record.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET DELETED RECORDS
// ============================================================

app.get(
  "/api/deleted-records",
  async (req, res) => {
    try {
      const [rows] =
        await pool.query(`
          SELECT
            id,
            original_record_id,
            deleted_by,
            original_data,
            deleted_at,
            restored_at,
            restored_by
          FROM deleted_records
          ORDER BY deleted_at DESC
        `);

      const data =
        rows.map((row) => {
          let originalData = {};

          try {
            if (
              typeof row.original_data ===
              "string"
            ) {
              originalData =
                JSON.parse(
                  row.original_data
                );
            } else {
              originalData =
                row.original_data ||
                {};
            }
          } catch {
            originalData = {};
          }

          return {
            id: row.id,

            originalRecordId:
              row.original_record_id,

            deletedBy:
              row.deleted_by,

            originalData,

            deletedAt:
              row.deleted_at,

            restoredAt:
              row.restored_at,

            restoredBy:
              row.restored_by,
          };
        });

      res.json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      console.error(
        "GET DELETED RECORDS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve deleted records.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET ONE DELETED RECORD
// ============================================================

app.get(
  "/api/deleted-records/:id",
  async (req, res) => {
    try {
      const deletedRecordId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          deletedRecordId
        ) ||
        deletedRecordId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid deleted record ID.",
        });
      }

      const [rows] =
        await pool.execute(
          `
          SELECT
            id,
            original_record_id,
            deleted_by,
            original_data,
            deleted_at,
            restored_at,
            restored_by
          FROM deleted_records
          WHERE id = ?
          LIMIT 1
          `,
          [deletedRecordId]
        );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message:
            "Deleted record not found.",
        });
      }

      const row = rows[0];

      let originalData = {};

      try {
        originalData =
          typeof row.original_data ===
          "string"
            ? JSON.parse(
                row.original_data
              )
            : row.original_data || {};
      } catch {
        originalData = {};
      }

      res.json({
        success: true,
        data: {
          id: row.id,
          originalRecordId:
            row.original_record_id,
          deletedBy:
            row.deleted_by,
          originalData,
          deletedAt:
            row.deleted_at,
          restoredAt:
            row.restored_at,
          restoredBy:
            row.restored_by,
        },
      });
    } catch (error) {
      console.error(
        "GET DELETED RECORD ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve deleted record.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// RESTORE DELETED RECORD
// ============================================================

app.post(
  "/api/deleted-record/:id/restore",
  async (req, res) => {
    const connection =
      await pool.getConnection();

    try {
      const deletedRecordId =
        Number(req.params.id);

      const {
        restoredBy =
          "Unknown User",
      } = req.body || {};

      if (
        !Number.isInteger(
          deletedRecordId
        ) ||
        deletedRecordId <= 0
      ) {
        connection.release();

        return res.status(400).json({
          success: false,
          message:
            "Invalid deleted record ID.",
        });
      }

      await connection.beginTransaction();

      const [rows] =
        await connection.execute(
          `
          SELECT *
          FROM deleted_records
          WHERE id = ?
          LIMIT 1
          `,
          [deletedRecordId]
        );

      if (!rows.length) {
        await connection.rollback();
        connection.release();

        return res.status(404).json({
          success: false,
          message:
            "Deleted record not found.",
        });
      }

      const deletedRecord =
        rows[0];

      if (
        deletedRecord.restored_at
      ) {
        await connection.rollback();
        connection.release();

        return res.status(409).json({
          success: false,
          message:
            "This record has already been restored.",
          restoredAt:
            deletedRecord.restored_at,
          restoredBy:
            deletedRecord.restored_by,
        });
      }

      let originalData = {};

      try {
        originalData =
          typeof deletedRecord.original_data ===
          "string"
            ? JSON.parse(
                deletedRecord.original_data
              )
            : deletedRecord.original_data ||
              {};
      } catch {
        originalData = {};
      }

      const originalId =
        String(
          deletedRecord.original_record_id ||
            originalData.id ||
            ""
        ).trim();

      let existingId = null;

      if (originalId) {
        existingId =
          await resolvePatientId(
            connection,
            originalId
          );
      }

      if (existingId) {
        await connection.rollback();
        connection.release();

        return res.status(409).json({
          success: false,
          message:
            "The patient already exists in the main database.",
          existingId,
        });
      }

      const firebaseId =
        originalData.firebaseId ||
        (
          String(
            originalData.id || ""
          ).startsWith("icare-")
            ? originalData.id
            : originalId.startsWith(
                "icare-"
              )
              ? originalId
              : null
        );

      const patientNo =
        originalData.no ??
        originalData.patientNo ??
        null;

      const philhealthNo =
        originalData.philhealthNo ??
        originalData.philHealthNo ??
        null;

      const dateOfBirth =
        cleanDate(
          originalData.dateOfBirth
        );

      const dateRegistered =
        cleanDate(
          originalData.dateRegistered
        );

      const birthDate =
        cleanDate(
          originalData.birthDate
        );

      await connection.execute(
        `
        INSERT INTO patients
        (
          philhealth_no,
          last_name,
          first_name,
          middle_name,
          date_of_birth,
          address,
          age,
          pcu,
          registration_status,
          date_registered,
          company,
          patient_no,
          contact_no,
          birth_date,
          sex,
          fpe_status,
          remarks,
          source,
          firebase_id,
          teleconsult_status,
          medicine_delivery,
          batch_id,
          batch_file_name,
          batch_uploaded_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          clean(
            philhealthNo
          ),

          clean(
            originalData.lastName
          ),

          clean(
            originalData.firstName
          ),

          clean(
            originalData.middleName
          ),

          dateOfBirth,

          clean(
            originalData.address
          ),

          originalData.age ===
            "" ||
          originalData.age ===
            null ||
          originalData.age ===
            undefined
            ? null
            : Number(
                originalData.age
              ),

          clean(
            originalData.pcu
          ),

          clean(
            originalData.registrationStatus
          ) ||
            "PENDING",

          dateRegistered,

          clean(
            originalData.company
          ),

          clean(patientNo),

          clean(
            originalData.contactNumber ??
              originalData.contactNo
          ),

          birthDate,

          clean(
            originalData.sex
          ),

          clean(
            originalData.fpe
          ),

          clean(
            originalData.remarks
          ),

          clean(
            originalData.source
          ) ||
            "restored",

          firebaseId,

          clean(
            originalData.teleconsultStatus
          ),

          clean(
            originalData.medicineDelivery
          ),

          clean(
            originalData.batchId
          ),

          clean(
            originalData.batchFileName
          ),

          originalData.batchUploadedAt
            ? String(
                originalData.batchUploadedAt
              ).slice(0, 19)
            : null,
        ]
      );

      await connection.execute(
        `
        UPDATE deleted_records
        SET
          restored_at = CURRENT_TIMESTAMP,
          restored_by = ?
        WHERE id = ?
        `,
        [
          restoredBy,
          deletedRecordId,
        ]
      );

      await connection.execute(
        `
        INSERT INTO audit_logs
        (
          action,
          record_id,
          user_email,
          created_at
        )
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [
          "RESTORE",
          originalId ||
            String(
              deletedRecordId
            ),
          restoredBy,
        ]
      );

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message:
          "Deleted patient restored successfully.",
        id: deletedRecordId,
        originalRecordId:
          originalId,
        restoredBy,
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}

      connection.release();

      console.error(
        "RESTORE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to restore deleted record.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// PATIENTS
// ============================================================

// ------------------------------------------------------------
// GET ALL PATIENTS
// ------------------------------------------------------------

app.get(
  "/api/patients",
  async (req, res) => {
    try {
      const [rows] =
        await pool.query(`
          ${patientSelect}
          ORDER BY id DESC
        `);

      const data =
        rows.map(normalizePatient);

      res.json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      console.error(
        "GET PATIENTS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve patients.",
        error: error.message,
      });
    }
  }
);

// ------------------------------------------------------------
// SEARCH PATIENTS
// IMPORTANT: BEFORE /:id
// ------------------------------------------------------------

app.get(
  "/api/patients/search",
  async (req, res) => {
    try {
      const search =
        String(
          req.query.q || ""
        ).trim();

      if (!search) {
        return res.json({
          success: true,
          count: 0,
          data: [],
        });
      }

      const value =
        `%${search}%`;

      const [rows] =
        await pool.execute(`
          ${patientSelect}
          WHERE
            philhealth_no LIKE ?
            OR last_name LIKE ?
            OR first_name LIKE ?
            OR middle_name LIKE ?
            OR company LIKE ?
            OR patient_no LIKE ?
          ORDER BY id DESC
        `, [
          value,
          value,
          value,
          value,
          value,
          value,
        ]);

      const data =
        rows.map(normalizePatient);

      res.json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      console.error(
        "SEARCH PATIENTS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to search patients.",
        error: error.message,
      });
    }
  }
);

// ------------------------------------------------------------
// GET ONE PATIENT
// ------------------------------------------------------------

app.get(
  "/api/patients/:id",
  async (req, res) => {
    const connection =
      await pool.getConnection();

    try {
      const patientId =
        await resolvePatientId(
          connection,
          req.params.id
        );

      if (!patientId) {
        connection.release();

        return res.status(404).json({
          success: false,
          message:
            "Patient not found.",
        });
      }

      const [rows] =
        await connection.execute(`
          ${patientSelect}
          WHERE id = ?
          LIMIT 1
        `, [patientId]);

      connection.release();

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found.",
        });
      }

      res.json({
        success: true,
        data:
          normalizePatient(
            rows[0]
          ),
      });
    } catch (error) {
      connection.release();

      console.error(
        "GET PATIENT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve patient.",
        error: error.message,
      });
    }
  }
);

// ------------------------------------------------------------
// CREATE PATIENT
// ------------------------------------------------------------

app.post(
  "/api/patients",
  async (req, res) => {
    try {
      const {
        philhealthNo = null,
        lastName = null,
        firstName = null,
        middleName = null,
        dateOfBirth = null,
        address = null,
        age = null,
        pcu = null,
        registrationStatus =
          "PENDING",
        dateRegistered = null,
        company = null,
        no = null,
        contactNumber = null,
        birthDate = null,
        sex = null,
        fpe = null,
        remarks = null,
        source = "mysql",
        firebaseId = null,
        teleconsultStatus = null,
        medicineDelivery = null,
        batchId = null,
        batchFileName = null,
        batchUploadedAt = null,
      } = req.body || {};

      if (
        philhealthNo &&
        String(
          philhealthNo
        ).trim()
      ) {
        const [
          duplicateRows,
        ] =
          await pool.execute(
            `
            SELECT id
            FROM patients
            WHERE philhealth_no = ?
            LIMIT 1
            `,
            [
              String(
                philhealthNo
              ).trim(),
            ]
          );

        if (
          duplicateRows.length
        ) {
          return res.status(409).json({
            success: false,
            message:
              "A patient with this PhilHealth No. already exists.",
            existingId:
              duplicateRows[0].id,
          });
        }
      }

      const [result] =
        await pool.execute(
          `
          INSERT INTO patients
          (
            philhealth_no,
            last_name,
            first_name,
            middle_name,
            date_of_birth,
            address,
            age,
            pcu,
            registration_status,
            date_registered,
            company,
            patient_no,
            contact_no,
            birth_date,
            sex,
            fpe_status,
            remarks,
            source,
            firebase_id,
            teleconsult_status,
            medicine_delivery,
            batch_id,
            batch_file_name,
            batch_uploaded_at
          )
          VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            clean(philhealthNo),
            clean(lastName),
            clean(firstName),
            clean(middleName),
            cleanDate(dateOfBirth),
            clean(address),
            age === "" ||
            age === null ||
            age === undefined
              ? null
              : Number(age),
            clean(pcu),
            clean(
              registrationStatus
            ) || "PENDING",
            cleanDate(
              dateRegistered
            ),
            clean(company),
            clean(no),
            clean(contactNumber),
            cleanDate(birthDate),
            clean(sex),
            clean(fpe),
            clean(remarks),
            clean(source) ||
              "mysql",
            clean(firebaseId),
            clean(
              teleconsultStatus
            ),
            clean(
              medicineDelivery
            ),
            clean(batchId),
            clean(batchFileName),
            batchUploadedAt
              ? String(
                  batchUploadedAt
                ).slice(0, 19)
              : null,
          ]
        );

      const [rows] =
        await pool.execute(`
          ${patientSelect}
          WHERE id = ?
          LIMIT 1
        `, [result.insertId]);

      res.status(201).json({
        success: true,
        message:
          "Patient created successfully.",
        data:
          normalizePatient(
            rows[0]
          ),
      });
    } catch (error) {
      console.error(
        "CREATE PATIENT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to create patient.",
        error: error.message,
      });
    }
  }
);

// ------------------------------------------------------------
// UPDATE PATIENT
// ------------------------------------------------------------

app.put(
  "/api/patients/:id",
  async (req, res) => {
    const connection =
      await pool.getConnection();

    try {
      const patientId =
        await resolvePatientId(
          connection,
          req.params.id
        );

      if (!patientId) {
        connection.release();

        return res.status(404).json({
          success: false,
          message:
            "Patient not found.",
        });
      }

      const {
        philhealthNo = null,
        lastName = null,
        firstName = null,
        middleName = null,
        dateOfBirth = null,
        address = null,
        age = null,
        pcu = null,
        registrationStatus =
          "PENDING",
        dateRegistered = null,
        company = null,
        no = null,
        contactNumber = null,
        birthDate = null,
        sex = null,
        fpe = null,
        remarks = null,
        source = null,
        firebaseId = null,
        teleconsultStatus = null,
        medicineDelivery = null,
        batchId = null,
        batchFileName = null,
        batchUploadedAt = null,
      } = req.body || {};

      if (philhealthNo) {
        const [
          duplicateRows,
        ] =
          await connection.execute(
            `
            SELECT id
            FROM patients
            WHERE philhealth_no = ?
              AND id <> ?
            LIMIT 1
            `,
            [
              String(
                philhealthNo
              ).trim(),
              patientId,
            ]
          );

        if (
          duplicateRows.length
        ) {
          connection.release();

          return res.status(409).json({
            success: false,
            message:
              "Another patient already uses this PhilHealth No.",
            existingId:
              duplicateRows[0].id,
          });
        }
      }

      await connection.execute(
        `
        UPDATE patients
        SET
          philhealth_no = ?,
          last_name = ?,
          first_name = ?,
          middle_name = ?,
          date_of_birth = ?,
          address = ?,
          age = ?,
          pcu = ?,
          registration_status = ?,
          date_registered = ?,
          company = ?,
          patient_no = ?,
          contact_no = ?,
          birth_date = ?,
          sex = ?,
          fpe_status = ?,
          remarks = ?,
          source = COALESCE(?, source),
          firebase_id = COALESCE(?, firebase_id),
          teleconsult_status = ?,
          medicine_delivery = ?,
          batch_id = ?,
          batch_file_name = ?,
          batch_uploaded_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          clean(philhealthNo),
          clean(lastName),
          clean(firstName),
          clean(middleName),
          cleanDate(dateOfBirth),
          clean(address),
          age === "" ||
          age === null ||
          age === undefined
            ? null
            : Number(age),
          clean(pcu),
          clean(
            registrationStatus
          ) || "PENDING",
          cleanDate(
            dateRegistered
          ),
          clean(company),
          clean(no),
          clean(contactNumber),
          cleanDate(birthDate),
          clean(sex),
          clean(fpe),
          clean(remarks),
          clean(source),
          clean(firebaseId),
          clean(
            teleconsultStatus
          ),
          clean(
            medicineDelivery
          ),
          clean(batchId),
          clean(batchFileName),
          batchUploadedAt
            ? String(
                batchUploadedAt
              ).slice(0, 19)
            : null,
          patientId,
        ]
      );

      const [rows] =
        await connection.execute(`
          ${patientSelect}
          WHERE id = ?
          LIMIT 1
        `, [patientId]);

      connection.release();

      res.json({
        success: true,
        message:
          "Patient updated successfully.",
        data:
          normalizePatient(
            rows[0]
          ),
      });
    } catch (error) {
      connection.release();

      console.error(
        "UPDATE PATIENT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update patient.",
        error: error.message,
      });
    }
  }
);

// ------------------------------------------------------------
// DELETE PATIENT
// NOTE:
// Backup is intentionally handled by /api/deleted-record
// so Firestore + MySQL safety copies do not duplicate.
// ------------------------------------------------------------

app.delete(
  "/api/patients/:id",
  async (req, res) => {
    const connection =
      await pool.getConnection();

    try {
      const patientId =
        await resolvePatientId(
          connection,
          req.params.id
        );

      if (!patientId) {
        connection.release();

        return res.status(404).json({
          success: false,
          message:
            "Patient not found.",
        });
      }

      const [result] =
        await connection.execute(
          `
          DELETE FROM patients
          WHERE id = ?
          `,
          [patientId]
        );

      connection.release();

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found.",
        });
      }

      res.json({
        success: true,
        message:
          "Patient deleted successfully.",
        deletedId:
          patientId,
      });
    } catch (error) {
      connection.release();

      console.error(
        "DELETE PATIENT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete patient.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// BULK DELETE PATIENTS
// ============================================================

app.post(
  "/api/patients/bulk-delete",
  async (req, res) => {
    const connection =
      await pool.getConnection();

    try {
      const ids = Array.isArray(
        req.body?.ids
      )
        ? req.body.ids
        : [];

      if (!ids.length) {
        connection.release();

        return res.status(400).json({
          success: false,
          message:
            "No patient IDs supplied.",
        });
      }

      const resolvedIds = [];

      for (const suppliedId of ids) {
        const resolved =
          await resolvePatientId(
            connection,
            suppliedId
          );

        if (resolved) {
          resolvedIds.push(
            resolved
          );
        }
      }

      const uniqueIds = [
        ...new Set(
          resolvedIds
        ),
      ];

      if (!uniqueIds.length) {
        connection.release();

        return res.status(404).json({
          success: false,
          message:
            "No matching patients found.",
        });
      }

      await connection.beginTransaction();

      const placeholders =
        uniqueIds
          .map(() => "?")
          .join(",");

      const [result] =
        await connection.execute(
          `
          DELETE FROM patients
          WHERE id IN (${placeholders})
          `,
          uniqueIds
        );

      await connection.commit();

      connection.release();

      res.json({
        success: true,
        message:
          "Patients deleted successfully.",
        deletedCount:
          result.affectedRows,
        deletedIds:
          uniqueIds,
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}

      connection.release();

      console.error(
        "BULK DELETE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete selected patients.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// ICARE BATCH HISTORY
// ============================================================

// ------------------------------------------------------------
// GET BATCHES
// ------------------------------------------------------------

app.get(
  "/api/icare-batches",
  async (req, res) => {
    try {
      const [rows] =
        await pool.query(`
          SELECT
            id,
            file_name,
            batch_id,
            patient_count,
            uploaded_at,
            source,
            uploaded_by
          FROM icare_batches
          ORDER BY uploaded_at DESC
        `);

      const data =
        rows.map((row) => ({
          id: row.id,

          fileName:
            row.file_name,

          batchId:
            row.batch_id,

          patientCount:
            row.patient_count,

          uploadedAt:
            row.uploaded_at,

          source:
            row.source,

          uploadedBy:
            row.uploaded_by,
        }));

      res.json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      console.error(
        "GET BATCH HISTORY ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve batch history.",
        error: error.message,
      });
    }
  }
);

// ------------------------------------------------------------
// IMPORT BATCH
// ------------------------------------------------------------

app.post(
  "/api/icare-batches/import",
  async (req, res) => {
    const connection =
      await pool.getConnection();

    try {
      const {
        batchId,
        fileName =
          "Unknown File",
        uploadedAt =
          new Date().toISOString(),
        uploadedBy =
          "Unknown User",
        patients = [],
      } = req.body || {};

      if (
        !batchId ||
        !Array.isArray(patients) ||
        patients.length === 0
      ) {
        connection.release();

        return res.status(400).json({
          success: false,
          message:
            "Batch ID and patients are required.",
        });
      }

      await connection.beginTransaction();

      const insertSql = `
        INSERT INTO patients
        (
          philhealth_no,
          last_name,
          first_name,
          middle_name,
          date_of_birth,
          address,
          age,
          pcu,
          registration_status,
          date_registered,
          company,
          patient_no,
          contact_no,
          birth_date,
          sex,
          fpe_status,
          remarks,
          source,
          firebase_id,
          teleconsult_status,
          medicine_delivery,
          batch_id,
          batch_file_name,
          batch_uploaded_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      let importedCount = 0;

      for (
        let index = 0;
        index < patients.length;
        index++
      ) {
        const patient =
          patients[index] || {};

        let firebaseId =
          patient.id ||
          null;

        if (!firebaseId) {
          firebaseId =
            "icare-" +
            Date.now() +
            "-" +
            index +
            "-" +
            Math.random()
              .toString(36)
              .substring(2, 8);
        }

        const philhealthNo =
          clean(
            patient.philhealthNo
          );

        if (philhealthNo) {
          const [
            duplicateRows,
          ] =
            await connection.execute(
              `
              SELECT id
              FROM patients
              WHERE philhealth_no = ?
              LIMIT 1
              `,
              [philhealthNo]
            );

          if (
            duplicateRows.length
          ) {
            continue;
          }
        }

        await connection.execute(
          insertSql,
          [
            philhealthNo,

            clean(
              patient.lastName
            ),

            clean(
              patient.firstName
            ),

            clean(
              patient.middleName
            ),

            cleanDate(
              patient.dateOfBirth
            ),

            clean(
              patient.address
            ),

            patient.age === "" ||
            patient.age === null ||
            patient.age ===
              undefined
              ? null
              : Number(
                  patient.age
                ),

            clean(
              patient.pcu
            ),

            clean(
              patient.registrationStatus
            ) || "PENDING",

            cleanDate(
              patient.dateRegistered
            ),

            clean(
              patient.company
            ),

            clean(patient.no),

            clean(
              patient.contactNumber
            ),

            cleanDate(
              patient.birthDate
            ),

            clean(patient.sex),

            clean(patient.fpe),

            clean(
              patient.remarks
            ),

            "batch-upload",

            firebaseId,

            clean(
              patient.teleconsultStatus
            ),

            clean(
              patient.medicineDelivery
            ),

            batchId,

            fileName,

            uploadedAt
              ? String(
                  uploadedAt
                ).slice(0, 19)
              : null,
          ]
        );

        importedCount++;
      }

      await connection.execute(
        `
        INSERT INTO icare_batches
        (
          id,
          file_name,
          batch_id,
          patient_count,
          uploaded_at,
          source,
          uploaded_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          batchId,
          fileName,
          batchId,
          importedCount,
          uploadedAt
            ? String(
                uploadedAt
              ).slice(0, 19)
            : null,
          "batch-upload",
          uploadedBy,
        ]
      );

      await connection.commit();
      connection.release();

      res.status(201).json({
        success: true,
        message:
          "Batch imported successfully.",
        batchId,
        importedCount,
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}

      connection.release();

      console.error(
        "BATCH IMPORT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to import batch.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// DELETE BATCH
// Backup must already exist before calling this endpoint.
// ============================================================

app.delete(
  "/api/icare-batches/:id",
  async (req, res) => {
    const connection =
      await pool.getConnection();

    try {
      const batchId =
        String(
          req.params.id || ""
        ).trim();

      if (!batchId) {
        connection.release();

        return res.status(400).json({
          success: false,
          message:
            "Invalid batch ID.",
        });
      }

      await connection.beginTransaction();

      const [
        patientRows,
      ] =
        await connection.execute(
          `
          SELECT id
          FROM patients
          WHERE batch_id = ?
          `,
          [batchId]
        );

      let deletedCount = 0;

      if (patientRows.length) {
        const ids =
          patientRows.map(
            (row) => row.id
          );

        const placeholders =
          ids
            .map(() => "?")
            .join(",");

        const [deleteResult] =
          await connection.execute(
            `
            DELETE FROM patients
            WHERE id IN (${placeholders})
            `,
            ids
          );

        deletedCount =
          deleteResult.affectedRows;
      }

      await connection.execute(
        `
        DELETE FROM icare_batches
        WHERE id = ?
           OR batch_id = ?
        `,
        [
          batchId,
          batchId,
        ]
      );

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message:
          "Batch deleted successfully.",
        deletedCount,
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}

      connection.release();

      console.error(
        "DELETE BATCH ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete batch.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// COMPANIES
// ============================================================

// ------------------------------------------------------------
// GET COMPANIES
// ------------------------------------------------------------

app.get(
  "/api/companies",
  async (req, res) => {
    try {
      const [rows] =
        await pool.query(`
          SELECT
            id,
            name,
            created_at,
            created_by
          FROM yakap_companies
          ORDER BY name ASC
        `);

      res.json({
        success: true,
        count: rows.length,
        data: rows.map(
          (row) => ({
            id: row.id,
            name: row.name,
            createdAt:
              row.created_at,
            createdBy:
              row.created_by,
          })
        ),
      });
    } catch (error) {
      console.error(
        "GET COMPANIES ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve companies.",
        error: error.message,
      });
    }
  }
);

// ------------------------------------------------------------
// ADD COMPANY
// ------------------------------------------------------------

app.post(
  "/api/companies",
  async (req, res) => {
    try {
      const {
        name,
        createdBy =
          "Unknown User",
      } = req.body || {};

      const companyName =
        String(
          name || ""
        ).trim();

      if (!companyName) {
        return res.status(400).json({
          success: false,
          message:
            "Company name is required.",
        });
      }

      const [
        existingRows,
      ] =
        await pool.execute(
          `
          SELECT id, name
          FROM yakap_companies
          WHERE LOWER(name) = LOWER(?)
          LIMIT 1
          `,
          [companyName]
        );

      if (
        existingRows.length
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Company already exists.",
          data:
            existingRows[0],
        });
      }

      const [result] =
        await pool.execute(
          `
          INSERT INTO yakap_companies
          (
            name,
            created_at,
            created_by
          )
          VALUES (?, CURRENT_TIMESTAMP, ?)
          `,
          [
            companyName,
            createdBy,
          ]
        );

      res.status(201).json({
        success: true,
        message:
          "Company added successfully.",
        data: {
          id: result.insertId,
          name: companyName,
        },
      });
    } catch (error) {
      console.error(
        "ADD COMPANY ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to add company.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// 404
// ============================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API endpoint not found.",
      path:
        req.originalUrl,
    });
  }
);

// ============================================================
// START
// ============================================================

const startServer =
  async () => {
    const connected =
      await testDatabaseConnection();

    if (connected) {
      await ensureSupportingTables();
    }

    app.listen(
      PORT,
      () => {
        console.log("");

        console.log(
          "========================================"
        );

        console.log(
          "🚀 YAKAP BACKEND SERVER STARTED"
        );

        console.log(
          "========================================"
        );

        console.log(
          `API: http://localhost:${PORT}`
        );

        console.log(
          `Health: http://localhost:${PORT}/api/health`
        );

        console.log(
          `Patients: http://localhost:${PORT}/api/patients`
        );

        console.log(
          `Audit: http://localhost:${PORT}/api/audit`
        );

        console.log(
          `Deleted Records: http://localhost:${PORT}/api/deleted-records`
        );

        console.log(
          `Batch History: http://localhost:${PORT}/api/icare-batches`
        );

        console.log(
          `Companies: http://localhost:${PORT}/api/companies`
        );

        console.log(
          "========================================"
        );

        console.log("");
      }
    );
  };

startServer();