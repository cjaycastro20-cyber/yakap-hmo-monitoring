import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import auth from "./firebase/auth";
import db from "./firebase/firestore";

import {
  logRestoreAudit,
  logAudit,
} from "./auditLog.js";

import "./DeletedRecords.css";

// =========================================================
// DELETED RECORDS
// YAKAP MONITORING SYSTEM
// =========================================================

function DeletedRecords() {
  // =======================================================
  // STATE
  // =======================================================

  const [deletedRecords, setDeletedRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("ALL");

  const [restoringId, setRestoringId] =
    useState(null);

  const [notification, setNotification] =
    useState(null);

  const [selectedRecordIds, setSelectedRecordIds] =
    useState([]);

  const [isRestoringSelected, setIsRestoringSelected] =
    useState(false);

  const [isDeletingSelected, setIsDeletingSelected] =
    useState(false);

  // =======================================================
  // NOTIFICATION
  // =======================================================

  const showNotification = (
    type,
    title,
    message
  ) => {
    setNotification({
      type,
      title,
      message,
    });

    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // =======================================================
  // LOAD DELETED RECORDS
  // =======================================================

  useEffect(() => {
    console.log(
      "========================================"
    );

    console.log(
      "🔥 DELETED RECORDS PAGE LOADED"
    );

    console.log(
      "========================================"
    );

    const deletedCollection =
      collection(
        db,
        "deletedRecords"
      );

    const unsubscribe =
      onSnapshot(
        deletedCollection,
        (snapshot) => {
          const records =
            snapshot.docs.map(
              (snapshotDoc) => ({
                id: snapshotDoc.id,
                ...snapshotDoc.data(),
              })
            );

          // -------------------------------------------------
          // SORT NEWEST FIRST
          // -------------------------------------------------

          records.sort(
            (a, b) => {
              const dateA =
                getTimestampMillis(
                  a.deletedAt
                );

              const dateB =
                getTimestampMillis(
                  b.deletedAt
                );

              return dateB - dateA;
            }
          );

          setDeletedRecords(
            records
          );

          setLoading(false);

          console.log(
            "DELETED RECORDS FROM FIRESTORE:",
            records
          );
        },
        (error) => {
          console.error(
            "❌ ERROR LOADING DELETED RECORDS:",
            error
          );

          setLoading(false);

          showNotification(
            "error",
            "LOAD ERROR",
            "Unable to load deleted records."
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // =======================================================
  // CONVERT FIRESTORE TIMESTAMP
  // =======================================================

  function getTimestampMillis(
    timestamp
  ) {
    if (!timestamp) {
      return 0;
    }

    if (
      typeof timestamp.toMillis ===
      "function"
    ) {
      return timestamp.toMillis();
    }

    if (
      timestamp.seconds !==
      undefined
    ) {
      return (
        Number(timestamp.seconds) *
          1000 +
        Math.floor(
          Number(
            timestamp.nanoseconds ||
              0
          ) / 1000000
        )
      );
    }

    if (
      timestamp instanceof Date
    ) {
      return timestamp.getTime();
    }

    if (
      typeof timestamp ===
      "string"
    ) {
      const parsed =
        new Date(timestamp).getTime();

      return Number.isNaN(parsed)
        ? 0
        : parsed;
    }

    return 0;
  }

  // =======================================================
  // FORMAT DATE
  // =======================================================

  const formatDate = (
    timestamp
  ) => {
    if (!timestamp) {
      return "—";
    }

    try {
      let date;

      if (
        typeof timestamp.toDate ===
        "function"
      ) {
        date =
          timestamp.toDate();
      } else if (
        timestamp instanceof Date
      ) {
        date = timestamp;
      } else if (
        timestamp.seconds !==
        undefined
      ) {
        date = new Date(
          Number(timestamp.seconds) *
            1000
        );
      } else {
        date = new Date(
          timestamp
        );
      }

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "—";
      }

      return date.toLocaleString(
        "en-PH",
        {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }
      );
    } catch {
      return "—";
    }
  };

  // =======================================================
  // GET PATIENT NAME
  // =======================================================

  const getPatientName = (
    record
  ) => {
    const data =
      record?.originalData ||
      {};

    const lastName =
      data.lastName ||
      "";

    const firstName =
      data.firstName ||
      "";

    const middleName =
      data.middleName ||
      "";

    const completeName =
      [
        lastName,
        firstName,
        middleName,
      ]
        .filter(Boolean)
        .join(", ");

    if (completeName) {
      return completeName;
    }

    return (
      record?.recordName ||
      data.name ||
      record?.originalRecordId ||
      "Unknown Patient"
    );
  };

  // =======================================================
  // FILTERED RECORDS
  // =======================================================

  const filteredRecords =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return deletedRecords.filter(
        (record) => {
          // -----------------------------------------------
          // STATUS FILTER
          // -----------------------------------------------

          if (
            filter === "DELETED" &&
            record.restored === true
          ) {
            return false;
          }

          if (
            filter === "RESTORED" &&
            record.restored !== true
          ) {
            return false;
          }

          // -----------------------------------------------
          // SEARCH
          // -----------------------------------------------

          if (!keyword) {
            return true;
          }

          const patient =
            record.originalData ||
            {};

          const searchableText =
            [
              getPatientName(record),
              record.module,
              record.originalCollection,
              record.originalRecordId,
              record.deletedBy,
              record.restoredBy,
              patient.company,
              patient.philhealthNo,
              patient.lastName,
              patient.firstName,
              patient.middleName,
              patient.contactNumber,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchableText.includes(
            keyword
          );
        }
      );
    }, [
      deletedRecords,
      search,
      filter,
    ]);

  // =======================================================
  // COUNTS
  // =======================================================

  const totalDeleted =
    deletedRecords.length;

  const activeDeleted =
    deletedRecords.filter(
      (record) =>
        record.restored !== true
    ).length;

  const restoredCount =
    deletedRecords.filter(
      (record) =>
        record.restored === true
    ).length;

  // =======================================================
  // SELECT ALL
  // =======================================================

  const selectableRecords =
    filteredRecords.filter(
      (record) =>
        record.restored !== true
    );

  const allSelected =
    selectableRecords.length >
      0 &&
    selectableRecords.every(
      (record) =>
        selectedRecordIds.includes(
          record.id
        )
    );

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedRecordIds(
        []
      );

      return;
    }

    setSelectedRecordIds(
      selectableRecords.map(
        (record) => record.id
      )
    );
  };

  // =======================================================
  // SELECT SINGLE
  // =======================================================

  const handleSelectRecord = (
    recordId
  ) => {
    setSelectedRecordIds(
      (previous) => {
        if (
          previous.includes(
            recordId
          )
        ) {
          return previous.filter(
            (id) =>
              id !== recordId
          );
        }

        return [
          ...previous,
          recordId,
        ];
      }
    );
  };

  // =======================================================
  // RESTORE SINGLE RECORD
  // =======================================================

  const handleRestoreRecord = async (
    deletedRecord
  ) => {
    if (!deletedRecord) {
      return;
    }

    if (
      deletedRecord.restored === true
    ) {
      showNotification(
        "error",
        "ALREADY RESTORED",
        "This record has already been restored."
      );

      return;
    }

    const originalCollection =
      deletedRecord.originalCollection;

    const originalRecordId =
      deletedRecord.originalRecordId;

    const originalData =
      deletedRecord.originalData ||
      {};

    if (
      !originalCollection ||
      !originalRecordId
    ) {
      showNotification(
        "error",
        "RESTORE FAILED",
        "The original collection or record ID is missing."
      );

      return;
    }

    const patientName =
      getPatientName(
        deletedRecord
      );

    const confirmed =
      window.confirm(
        `Restore this record?\n\n${patientName}\n\nThe record will be returned to ${originalCollection}.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setRestoringId(
        deletedRecord.id
      );

      console.log(
        "========================================"
      );

      console.log(
        "♻️ RESTORE RECORD START"
      );

      console.log(
        "Backup ID:",
        deletedRecord.id
      );

      console.log(
        "Original Collection:",
        originalCollection
      );

      console.log(
        "Original Record ID:",
        originalRecordId
      );

      console.log(
        "Original Data:",
        originalData
      );

      console.log(
        "========================================"
      );

      // ---------------------------------------------------
      // CREATE THE ORIGINAL DOCUMENT AGAIN
      // ---------------------------------------------------

      const batch =
        writeBatch(db);

      const originalRef =
        doc(
          db,
          originalCollection,
          originalRecordId
        );

      batch.set(
        originalRef,
        originalData
      );

      // ---------------------------------------------------
      // MARK BACKUP AS RESTORED
      // ---------------------------------------------------

      const currentUser =
        auth.currentUser;

      const restoredBy =
        currentUser?.email ||
        "Unknown User";

      const restoredByUid =
        currentUser?.uid ||
        null;

      const deletedRecordRef =
        doc(
          db,
          "deletedRecords",
          deletedRecord.id
        );

      batch.update(
        deletedRecordRef,
        {
          restored: true,
          restoredBy,
          restoredByUid,
          restoredAt:
            serverTimestamp(),
        }
      );

      // ---------------------------------------------------
      // ATOMIC FIRESTORE WRITE
      // ---------------------------------------------------

      await batch.commit();

      // ---------------------------------------------------
      // AUDIT
      // ---------------------------------------------------

      const auditSuccess =
        await logRestoreAudit({
          recordId:
            originalRecordId,

          recordName:
            patientName,

          details:
            `Deleted record restored to ${originalCollection}.`,
        });

      if (!auditSuccess) {
        console.warn(
          "⚠️ Record restored but restore audit failed."
        );
      }

      setSelectedRecordIds(
        (previous) =>
          previous.filter(
            (id) =>
              id !==
              deletedRecord.id
          )
      );

      showNotification(
        "success",
        "RECORD RESTORED",
        `${patientName} has been successfully restored.`
      );

      console.log(
        "========================================"
      );

      console.log(
        "✅ RESTORE SUCCESS"
      );

      console.log(
        "========================================"
      );
    } catch (error) {
      console.error(
        "========================================"
      );

      console.error(
        "❌ RESTORE ERROR"
      );

      console.error(
        error
      );

      console.error(
        "========================================"
      );

      showNotification(
        "error",
        "RESTORE FAILED",
        error?.message ||
          "Unable to restore the selected record."
      );
    } finally {
      setRestoringId(
        null
      );
    }
  };

  // =======================================================
  // RESTORE SELECTED
  // =======================================================

  const handleRestoreSelected =
    async () => {
      const recordsToRestore =
        deletedRecords.filter(
          (record) =>
            selectedRecordIds.includes(
              record.id
            ) &&
            record.restored !== true
        );

      if (
        recordsToRestore.length ===
        0
      ) {
        showNotification(
          "error",
          "NO RECORDS SELECTED",
          "Please select at least one deleted record to restore."
        );

        return;
      }

      const names =
        recordsToRestore
          .slice(0, 10)
          .map(
            (record) =>
              `• ${getPatientName(
                record
              )}`
          )
          .join("\n");

      const extra =
        recordsToRestore.length >
        10
          ? `\n• +${
              recordsToRestore.length -
              10
            } more`
          : "";

      const confirmed =
        window.confirm(
          `Restore ${recordsToRestore.length} record(s)?\n\n${names}${extra}\n\nThe records will be returned to their original collections.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setIsRestoringSelected(
          true
        );

        // -------------------------------------------------
        // FIRESTORE BATCH
        // -------------------------------------------------

        let batch =
          writeBatch(db);

        let operationCount = 0;

        const restoredRecords =
          [];

        for (
          const deletedRecord of
            recordsToRestore
        ) {
          const originalCollection =
            deletedRecord.originalCollection;

          const originalRecordId =
            deletedRecord.originalRecordId;

          const originalData =
            deletedRecord.originalData ||
            {};

          if (
            !originalCollection ||
            !originalRecordId
          ) {
            console.warn(
              "Skipping invalid deleted record:",
              deletedRecord.id
            );

            continue;
          }

          const originalRef =
            doc(
              db,
              originalCollection,
              originalRecordId
            );

          batch.set(
            originalRef,
            originalData
          );

          const currentUser =
            auth.currentUser;

          const deletedRecordRef =
            doc(
              db,
              "deletedRecords",
              deletedRecord.id
            );

          batch.update(
            deletedRecordRef,
            {
              restored: true,
              restoredBy:
                currentUser?.email ||
                "Unknown User",
              restoredByUid:
                currentUser?.uid ||
                null,
              restoredAt:
                serverTimestamp(),
            }
          );

          restoredRecords.push(
            deletedRecord
          );

          operationCount += 2;

          // Firestore batch maximum is 500 writes.
          // Keep a safe limit.
          if (
            operationCount >=
            450
          ) {
            await batch.commit();

            batch =
              writeBatch(db);

            operationCount = 0;
          }
        }

        if (
          operationCount > 0
        ) {
          await batch.commit();
        }

        // -------------------------------------------------
        // AUDIT EACH RESTORED RECORD
        // -------------------------------------------------

        for (
          const deletedRecord of
            restoredRecords
        ) {
          const auditSuccess =
            await logRestoreAudit({
              recordId:
                deletedRecord.originalRecordId,

              recordName:
                getPatientName(
                  deletedRecord
                ),

              details:
                `Deleted record restored to ${deletedRecord.originalCollection}.`,
            });

          if (!auditSuccess) {
            console.warn(
              "⚠️ Restore audit failed for:",
              deletedRecord.id
            );
          }
        }

        setSelectedRecordIds(
          []
        );

        showNotification(
          "success",
          "RECORDS RESTORED",
          `${restoredRecords.length} record(s) have been successfully restored.`
        );
      } catch (error) {
        console.error(
          "❌ BULK RESTORE ERROR:",
          error
        );

        showNotification(
          "error",
          "RESTORE FAILED",
          error?.message ||
            "Unable to restore the selected records."
        );
      } finally {
        setIsRestoringSelected(
          false
        );
      }
    };

  // =======================================================
  // DELETE BACKUP PERMANENTLY
  //
  // IMPORTANT:
  // This deletes only the backup entry.
  // It does NOT restore/delete the original patient.
  // =======================================================

  const handlePermanentDelete =
    async (
      deletedRecord
    ) => {
      const patientName =
        getPatientName(
          deletedRecord
        );

      const confirmed =
        window.confirm(
          `PERMANENTLY DELETE this backup?\n\n${patientName}\n\nThis will remove the deleted-record backup permanently. This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setRestoringId(
          deletedRecord.id
        );

        await deleteDoc(
          doc(
            db,
            "deletedRecords",
            deletedRecord.id
          )
        );

        setSelectedRecordIds(
          (previous) =>
            previous.filter(
              (id) =>
                id !==
                deletedRecord.id
            )
        );

        showNotification(
          "success",
          "BACKUP DELETED",
          `${patientName}'s deleted-record backup was permanently removed.`
        );
      } catch (error) {
        console.error(
          "❌ PERMANENT DELETE ERROR:",
          error
        );

        showNotification(
          "error",
          "DELETE FAILED",
          error?.message ||
            "Unable to permanently delete the backup."
        );
      } finally {
        setRestoringId(
          null
        );
      }
    };

  // =======================================================
  // BULK PERMANENT DELETE
  //
  // IMPORTANT:
  // This deletes ONLY the selected backup entries
  // from deletedRecords.
  //
  // It does NOT restore or delete the original patient.
  // =======================================================

  const handleBulkPermanentDelete =
    async () => {
      const recordsToDelete =
        deletedRecords.filter(
          (record) =>
            selectedRecordIds.includes(
              record.id
            )
        );

      if (
        recordsToDelete.length ===
        0
      ) {
        showNotification(
          "error",
          "NO RECORDS SELECTED",
          "Please select at least one deleted record."
        );

        return;
      }

      const names =
        recordsToDelete
          .slice(0, 10)
          .map(
            (record) =>
              `• ${getPatientName(
                record
              )}`
          )
          .join("\n");

      const extra =
        recordsToDelete.length >
        10
          ? `\n• +${
              recordsToDelete.length -
              10
            } more`
          : "";

      const confirmed =
        window.confirm(
          `PERMANENTLY DELETE ${recordsToDelete.length} backup record(s)?\n\n${names}${extra}\n\nThis will permanently remove the selected backup records from Deleted Records.\n\nThe original patient records will NOT be restored.\n\nThis action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setIsDeletingSelected(
          true
        );

        // -------------------------------------------------
        // FIRESTORE BATCH DELETE
        // -------------------------------------------------

        let batch =
          writeBatch(db);

        let operationCount = 0;

        for (
          const deletedRecord of
            recordsToDelete
        ) {
          const deletedRecordRef =
            doc(
              db,
              "deletedRecords",
              deletedRecord.id
            );

          batch.delete(
            deletedRecordRef
          );

          operationCount++;

          // Firestore batch maximum is 500 writes.
          // Keep a safe limit.
          if (
            operationCount >=
            450
          ) {
            await batch.commit();

            batch =
              writeBatch(db);

            operationCount = 0;
          }
        }

        if (
          operationCount > 0
        ) {
          await batch.commit();
        }

        // -------------------------------------------------
        // AUDIT EACH PERMANENT DELETE
        // -------------------------------------------------

        const currentUser =
          auth.currentUser;

        const userEmail =
          currentUser?.email ||
          "Unknown User";

        for (
          const deletedRecord of
            recordsToDelete
        ) {
          const auditSuccess =
            await logAudit(
              "PERMANENT DELETE",
              "Deleted Records",
              deletedRecord.originalRecordId ||
                deletedRecord.id,
              getPatientName(
                deletedRecord
              ),
              "Deleted-record backup permanently removed.",
              userEmail
            );

          if (!auditSuccess) {
            console.warn(
              "⚠️ Permanent delete audit failed for:",
              deletedRecord.id
            );
          }
        }

        // -------------------------------------------------
        // CLEAR SELECTION
        // -------------------------------------------------

        setSelectedRecordIds(
          []
        );

        showNotification(
          "success",
          "BACKUPS DELETED",
          `${recordsToDelete.length} backup record(s) were permanently deleted.`
        );

      } catch (error) {
        console.error(
          "❌ BULK PERMANENT DELETE ERROR:",
          error
        );

        showNotification(
          "error",
          "DELETE FAILED",
          error?.message ||
            "Unable to permanently delete the selected backups."
        );

      } finally {
        setIsDeletingSelected(
          false
        );
      }
    };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="deleted-records-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="deleted-records-header">

        <div>
          <div className="deleted-records-title-row">

            <div className="deleted-records-icon">
              🗑
            </div>

            <div>
              <h1>
                DELETED RECORDS
              </h1>

              <p>
                Backup and restore deleted YAKAP records
              </p>
            </div>

          </div>
        </div>

        <div className="deleted-records-header-stats">

          <div className="deleted-stat">

            <span>
              TOTAL
            </span>

            <strong>
              {totalDeleted}
            </strong>

          </div>

          <div className="deleted-stat">

            <span>
              DELETED
            </span>

            <strong>
              {activeDeleted}
            </strong>

          </div>

          <div className="deleted-stat">

            <span>
              RESTORED
            </span>

            <strong>
              {restoredCount}
            </strong>

          </div>

        </div>

      </div>

      {/* =================================================
          CONTROLS
      ================================================= */}

      <div className="deleted-records-toolbar">

        <div className="deleted-search-wrapper">

          <span className="deleted-search-icon">
            🔎
          </span>

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search patient, PhilHealth No., company, user..."
          />

          {search && (
            <button
              type="button"
              className="deleted-search-clear"
              onClick={() =>
                setSearch("")
              }
            >
              ×
            </button>
          )}

        </div>

        <div className="deleted-filter-group">

          <button
            type="button"
            className={
              filter === "ALL"
                ? "deleted-filter active"
                : "deleted-filter"
            }
            onClick={() =>
              setFilter("ALL")
            }
          >
            ALL
          </button>

          <button
            type="button"
            className={
              filter === "DELETED"
                ? "deleted-filter active"
                : "deleted-filter"
            }
            onClick={() =>
              setFilter("DELETED")
            }
          >
            DELETED
          </button>

          <button
            type="button"
            className={
              filter === "RESTORED"
                ? "deleted-filter active"
                : "deleted-filter"
            }
            onClick={() =>
              setFilter("RESTORED")
            }
          >
            RESTORED
          </button>

        </div>

      </div>

      {/* =================================================
          BULK ACTION
      ================================================= */}

      {selectedRecordIds.length >
        0 && (

        <div className="deleted-bulk-bar">

          <div>
            <strong>
              {selectedRecordIds.length}
            </strong>{" "}
            record(s) selected
          </div>

          <div className="deleted-bulk-actions">

            <button
              type="button"
              className="deleted-restore-selected"
              onClick={
                handleRestoreSelected
              }
              disabled={
                isRestoringSelected ||
                isDeletingSelected
              }
            >
              {isRestoringSelected
                ? "RESTORING..."
                : "♻ RESTORE SELECTED"}
            </button>

            <button
              type="button"
              className="deleted-permanent-selected"
              onClick={
                handleBulkPermanentDelete
              }
              disabled={
                isRestoringSelected ||
                isDeletingSelected
              }
            >
              {isDeletingSelected
                ? "DELETING..."
                : "🗑 DELETE SELECTED"}
            </button>

          </div>

        </div>

      )}

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="deleted-records-content">

        {loading ? (

          <div className="deleted-empty-state">

            <div className="deleted-loading-spinner" />

            <strong>
              Loading deleted records...
            </strong>

            <p>
              Please wait while the backup records are loaded.
            </p>

          </div>

        ) : filteredRecords.length ===
          0 ? (

          <div className="deleted-empty-state">

            <div className="deleted-empty-icon">
              🗑
            </div>

            <strong>
              {search
                ? "No matching records"
                : "No deleted records found"}
            </strong>

            <p>
              {search
                ? "Try a different search keyword."
                : "Deleted patient records will appear here after they are backed up."}
            </p>

          </div>

        ) : (

          <div className="deleted-table-wrapper">

            <table className="deleted-records-table">

              <thead>

                <tr>

                  <th className="deleted-checkbox-column">

                    <input
                      type="checkbox"
                      checked={
                        allSelected
                      }
                      onChange={
                        handleSelectAll
                      }
                      aria-label="Select all deleted records"
                    />

                  </th>

                  <th>
                    PATIENT
                  </th>

                  <th>
                    PHILHEALTH NO.
                  </th>

                  <th>
                    COMPANY
                  </th>

                  <th>
                    MODULE
                  </th>

                  <th>
                    DELETED BY
                  </th>

                  <th>
                    DELETED AT
                  </th>

                  <th>
                    STATUS
                  </th>

                  <th>
                    ACTION
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredRecords.map(
                  (record) => {

                    const patient =
                      record.originalData ||
                      {};

                    const isRestored =
                      record.restored ===
                      true;

                    const isProcessing =
                      restoringId ===
                      record.id;

                    return (

                      <tr
                        key={
                          record.id
                        }
                        className={
                          isRestored
                            ? "deleted-row-restored"
                            : ""
                        }
                      >

                        {/* CHECKBOX */}

                        <td>

                          {!isRestored ? (

                            <input
                              type="checkbox"
                              checked={selectedRecordIds.includes(
                                record.id
                              )}
                              onChange={() =>
                                handleSelectRecord(
                                  record.id
                                )
                              }
                              aria-label={`Select ${getPatientName(
                                record
                              )}`}
                            />

                          ) : (

                            <span className="deleted-checkmark">
                              ✓
                            </span>

                          )}

                        </td>

                        {/* PATIENT */}

                        <td>

                          <div className="deleted-patient-cell">

                            <strong>
                              {
                                getPatientName(
                                  record
                                )
                              }
                            </strong>

                            <small>
                              ID:{" "}
                              {
                                record.originalRecordId ||
                                "—"
                              }
                            </small>

                          </div>

                        </td>

                        {/* PHILHEALTH */}

                        <td>

                          <span className="deleted-data-value">
                            {
                              patient.philhealthNo ||
                              "—"
                            }
                          </span>

                        </td>

                        {/* COMPANY */}

                        <td>

                          <span className="deleted-data-value">
                            {
                              patient.company ||
                              "—"
                            }
                          </span>

                        </td>

                        {/* MODULE */}

                        <td>

                          <span className="deleted-module-badge">
                            {
                              record.module ||
                              "Unknown"
                            }
                          </span>

                        </td>

                        {/* DELETED BY */}

                        <td>

                          <div className="deleted-user-cell">

                            <strong>
                              {
                                record.deletedBy ||
                                "Unknown User"
                              }
                            </strong>

                            {record.deletedByUid && (
                              <small>
                                UID:{" "}
                                {
                                  record.deletedByUid
                                }
                              </small>
                            )}

                          </div>

                        </td>

                        {/* DELETED AT */}

                        <td>

                          <span className="deleted-date">
                            {
                              formatDate(
                                record.deletedAt
                              )
                            }
                          </span>

                        </td>

                        {/* STATUS */}

                        <td>

                          {isRestored ? (

                            <div className="deleted-status restored">

                              <span>
                                ✓
                              </span>

                              RESTORED

                            </div>

                          ) : (

                            <div className="deleted-status deleted">

                              <span>
                                ●
                              </span>

                              DELETED

                            </div>

                          )}

                        </td>

                        {/* ACTION */}

                        <td>

                          <div className="deleted-action-group">

                            {!isRestored && (

                              <button
                                type="button"
                                className="deleted-restore-button"
                                onClick={() =>
                                  handleRestoreRecord(
                                    record
                                  )
                                }
                                disabled={
                                  isProcessing ||
                                  isRestoringSelected ||
                                  isDeletingSelected
                                }
                              >
                                {isProcessing
                                  ? "RESTORING..."
                                  : "♻ RESTORE"}
                              </button>

                            )}

                            <button
                              type="button"
                              className="deleted-permanent-button"
                              onClick={() =>
                                handlePermanentDelete(
                                  record
                                )
                              }
                              disabled={
                                isProcessing ||
                                isRestoringSelected ||
                                isDeletingSelected
                              }
                              title="Permanently delete this backup"
                            >
                              🗑
                            </button>

                          </div>

                          {isRestored && (
                            <small className="deleted-restored-info">

                              Restored by{" "}
                              {
                                record.restoredBy ||
                                "Unknown User"
                              }

                              <br />

                              {
                                formatDate(
                                  record.restoredAt
                                )
                              }

                            </small>
                          )}

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      {!loading &&
        filteredRecords.length >
          0 && (

        <div className="deleted-records-footer">

          <span>
            Showing{" "}
            <strong>
              {
                filteredRecords.length
              }
            </strong>{" "}
            of{" "}
            <strong>
              {totalDeleted}
            </strong>{" "}
            deleted record(s)
          </span>

          <span>
            Live Firestore backup
          </span>

        </div>

      )}

      {/* =================================================
          NOTIFICATION
      ================================================= */}

      {notification && (

        <div
          className={`deleted-toast ${notification.type}`}
          role="status"
          aria-live="polite"
        >

          <div className="deleted-toast-icon">

            {notification.type ===
            "success"
              ? "✓"
              : "!"}

          </div>

          <div className="deleted-toast-content">

            <strong>
              {
                notification.title
              }
            </strong>

            <p>
              {
                notification.message
              }
            </p>

          </div>

          <button
            type="button"
            className="deleted-toast-close"
            onClick={() =>
              setNotification(
                null
              )
            }
          >
            ×
          </button>

        </div>

      )}

    </div>
  );
}

export default DeletedRecords;