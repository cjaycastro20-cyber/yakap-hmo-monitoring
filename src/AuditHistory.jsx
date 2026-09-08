import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import db from "./firebase/firestore";

import "./AuditHistory.css";

// =========================================================
// AUDIT HISTORY
// =========================================================

const AuditHistory = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [moduleFilter, setModuleFilter] = useState("ALL");

  // =======================================================
  // LOAD AUDIT LOGS
  // =======================================================

  useEffect(() => {
    console.log("========================================");
    console.log("🔥 AUDIT HISTORY LOADED");
    console.log("🔥 Listening to auditLogs...");
    console.log("========================================");

    const auditQuery = query(
      collection(db, "auditLogs"),
      orderBy("performedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      auditQuery,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        console.log(
          "AUDIT HISTORY FROM FIRESTORE:",
          logs
        );

        setAuditLogs(logs);
        setLoading(false);
      },
      (error) => {
        console.error(
          "❌ AUDIT HISTORY FIRESTORE ERROR:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =======================================================
  // FORMAT DATE
  // =======================================================

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Pending...";
    }

    try {
      let date;

      if (
        timestamp &&
        typeof timestamp.toDate === "function"
      ) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }

      if (Number.isNaN(date.getTime())) {
        return "Invalid Date";
      }

      return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error(
        "❌ DATE FORMAT ERROR:",
        error
      );

      return "Unknown Date";
    }
  };

  // =======================================================
  // GET ACTION CLASS
  // =======================================================

  const getActionClass = (action) => {
    const normalized =
      String(action || "")
        .toUpperCase()
        .trim();

    switch (normalized) {
      case "CREATE":
        return "audit-action-create";

      case "UPDATE":
        return "audit-action-update";

      case "DELETE":
        return "audit-action-delete";

      case "BATCH_IMPORT":
        return "audit-action-import";

      case "BATCH_DELETE":
        return "audit-action-batch-delete";

      case "RESTORE":
        return "audit-action-restore";

      default:
        return "audit-action-default";
    }
  };

  // =======================================================
  // GET MODULES
  // =======================================================

  const modules = useMemo(() => {
    const uniqueModules = [
      ...new Set(
        auditLogs
          .map((log) => log.module)
          .filter(Boolean)
      ),
    ];

    return uniqueModules.sort();
  }, [auditLogs]);

  // =======================================================
  // FILTER LOGS
  // =======================================================

  const filteredLogs = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const action =
        String(log.action || "").toLowerCase();

      const module =
        String(log.module || "").toLowerCase();

      const recordName =
        String(log.recordName || "").toLowerCase();

      const recordId =
        String(log.recordId || "").toLowerCase();

      const performedBy =
        String(log.performedBy || "").toLowerCase();

      const details =
        String(log.details || "").toLowerCase();

      const matchesSearch =
        !searchValue ||
        action.includes(searchValue) ||
        module.includes(searchValue) ||
        recordName.includes(searchValue) ||
        recordId.includes(searchValue) ||
        performedBy.includes(searchValue) ||
        details.includes(searchValue);

      const matchesAction =
        actionFilter === "ALL" ||
        String(log.action || "").toUpperCase() ===
          actionFilter;

      const matchesModule =
        moduleFilter === "ALL" ||
        String(log.module || "") ===
          moduleFilter;

      return (
        matchesSearch &&
        matchesAction &&
        matchesModule
      );
    });
  }, [
    auditLogs,
    search,
    actionFilter,
    moduleFilter,
  ]);

  // =======================================================
  // SUMMARY COUNTS
  // =======================================================

  const totalLogs = auditLogs.length;

  const createCount = auditLogs.filter(
    (log) =>
      String(log.action || "").toUpperCase() ===
      "CREATE"
  ).length;

  const updateCount = auditLogs.filter(
    (log) =>
      String(log.action || "").toUpperCase() ===
      "UPDATE"
  ).length;

  const deleteCount = auditLogs.filter(
    (log) =>
      String(log.action || "").toUpperCase() ===
      "DELETE"
  ).length;

  const restoreCount = auditLogs.filter(
    (log) =>
      String(log.action || "").toUpperCase() ===
      "RESTORE"
  ).length;

  // =======================================================
  // CLEAR FILTERS
  // =======================================================

  const clearFilters = () => {
    setSearch("");
    setActionFilter("ALL");
    setModuleFilter("ALL");
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="audit-history-page">

      <div className="audit-history-header">

        <div>
          <h1>Audit History</h1>

          <p>
            Track user activities and system changes
            across the YAKAP Monitoring System.
          </p>
        </div>

        <div className="audit-live-status">
          <span className="audit-live-dot"></span>
          Live Monitoring
        </div>

      </div>

      <div className="audit-summary-grid">

        <div className="audit-summary-card">
          <div className="audit-summary-icon">
            🧾
          </div>

          <div>
            <span>Total Activities</span>
            <strong>{totalLogs}</strong>
          </div>
        </div>

        <div className="audit-summary-card">
          <div className="audit-summary-icon">
            ➕
          </div>

          <div>
            <span>Created</span>
            <strong>{createCount}</strong>
          </div>
        </div>

        <div className="audit-summary-card">
          <div className="audit-summary-icon">
            ✏️
          </div>

          <div>
            <span>Updated</span>
            <strong>{updateCount}</strong>
          </div>
        </div>

        <div className="audit-summary-card">
          <div className="audit-summary-icon">
            🗑️
          </div>

          <div>
            <span>Deleted</span>
            <strong>{deleteCount}</strong>
          </div>
        </div>

        <div className="audit-summary-card">
          <div className="audit-summary-icon">
            ♻️
          </div>

          <div>
            <span>Restored</span>
            <strong>{restoreCount}</strong>
          </div>
        </div>

      </div>

      <div className="audit-filter-card">

        <div className="audit-search-box">

          <span>🔍</span>

          <input
            type="text"
            placeholder="Search audit history..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

        <select
          value={actionFilter}
          onChange={(event) =>
            setActionFilter(event.target.value)
          }
        >
          <option value="ALL">
            All Actions
          </option>

          <option value="CREATE">
            CREATE
          </option>

          <option value="UPDATE">
            UPDATE
          </option>

          <option value="DELETE">
            DELETE
          </option>

          <option value="BATCH_IMPORT">
            BATCH IMPORT
          </option>

          <option value="BATCH_DELETE">
            BATCH DELETE
          </option>

          <option value="RESTORE">
            RESTORE
          </option>
        </select>

        <select
          value={moduleFilter}
          onChange={(event) =>
            setModuleFilter(event.target.value)
          }
        >
          <option value="ALL">
            All Modules
          </option>

          {modules.map((module) => (
            <option
              key={module}
              value={module}
            >
              {module}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="audit-clear-button"
          onClick={clearFilters}
        >
          Clear
        </button>

      </div>

      <div className="audit-results-info">
        Showing{" "}
        <strong>{filteredLogs.length}</strong>{" "}
        of{" "}
        <strong>{totalLogs}</strong>{" "}
        activities
      </div>

      <div className="audit-table-card">

        {loading ? (
          <div className="audit-empty-state">

            <div className="audit-loading-spinner"></div>

            <h3>
              Loading Audit History...
            </h3>

            <p>
              Connecting to Firebase audit logs.
            </p>

          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="audit-empty-state">

            <div className="audit-empty-icon">
              🧾
            </div>

            <h3>
              No Audit Records Found
            </h3>

            <p>
              No activities match your current
              search or filters.
            </p>

            {(search ||
              actionFilter !== "ALL" ||
              moduleFilter !== "ALL") && (
              <button
                type="button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}

          </div>
        ) : (
          <div className="audit-table-wrapper">

            <table className="audit-table">

              <thead>
                <tr>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Record</th>
                  <th>Performed By</th>
                  <th>Date &amp; Time</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>

                {filteredLogs.map((log) => (

                  <tr key={log.id}>

                    <td>
                      <span
                        className={`audit-action-badge ${getActionClass(
                          log.action
                        )}`}
                      >
                        {log.action || "UNKNOWN"}
                      </span>
                    </td>

                    <td>
                      <span className="audit-module">
                        {log.module ||
                          "Unknown Module"}
                      </span>
                    </td>

                    <td>

                      <div className="audit-record">

                        <strong>
                          {log.recordName ||
                            "Unnamed Record"}
                        </strong>

                        {log.recordId && (
                          <small>
                            ID: {log.recordId}
                          </small>
                        )}

                      </div>

                    </td>

                    <td>

                      <div className="audit-user">

                        <div className="audit-user-avatar">
                          {(log.performedBy ||
                            "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>

                          <strong>
                            {log.performedBy ||
                              "Unknown User"}
                          </strong>

                          {log.performedByUid && (
                            <small>
                              UID:{" "}
                              {log.performedByUid}
                            </small>
                          )}

                        </div>

                      </div>

                    </td>

                    <td>
                      <span className="audit-date">
                        {formatDate(
                          log.performedAt
                        )}
                      </span>
                    </td>

                    <td>

                      <div className="audit-details">

                        {log.details ||
                          "No additional details."}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
};

// =========================================================
// IMPORTANT: DEFAULT EXPORT
// =========================================================

export default AuditHistory;