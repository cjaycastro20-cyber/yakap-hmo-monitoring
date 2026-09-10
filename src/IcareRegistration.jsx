import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as XLSX from "xlsx";

import auth from "./firebase/auth";

import {
  logAudit,
  backupDeletedRecord,
} from "./auditLog.js";

import "./IcareRegistration.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";


// ============================================================
// HELPERS
// ============================================================

const getCurrentUserEmail = () => {
  return (
    auth?.currentUser?.email ||
    "Unknown User"
  );
};


const formatApiDate = (value) => {
  if (!value) return "";

  const text = String(value);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {
    return text;
  }

  const match =
    text.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

  if (match) {
    return match[1];
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};


const createPatientId = (
  index = 0
) => {
  return (
    "icare-" +
    Date.now() +
    "-" +
    index +
    "-" +
    Math.random()
      .toString(36)
      .substring(2, 8)
  );
};


const normalizePhilhealth = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  let text =
    String(value)
      .trim()
      .replace(/\s+/g, "");

  if (
    /^\d+\.0$/.test(text)
  ) {
    text =
      text.replace(
        ".0",
        ""
      );
  }

  return text.toUpperCase();
};


// ============================================================
// COMPONENT
// ============================================================

function IcareRegistration({
  icareData = [],
  getValue = (record, key) =>
    record?.[key],
}) {

  // ==========================================================
  // PATIENTS
  // ==========================================================

  const [
    addedPatients,
    setAddedPatients,
  ] = useState([]);

  const [
    isLoadingPatients,
    setIsLoadingPatients,
  ] = useState(true);


  const loadPatients =
    async () => {
      try {
        setIsLoadingPatients(
          true
        );

        const response =
          await fetch(
            `${API_URL}/api/patients`
          );

        if (!response.ok) {
          throw new Error(
            "Unable to load patients."
          );
        }

        const result =
          await response.json();

        if (
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to load patients."
          );
        }

        setAddedPatients(
          Array.isArray(
            result.data
          )
            ? result.data
            : []
        );
      } catch (error) {
        console.error(
          "Error loading ICARE patients from MySQL:",
          error
        );

        setAddedPatients([]);

        alert(
          "Unable to load ICARE patients from MySQL."
        );
      } finally {
        setIsLoadingPatients(
          false
        );
      }
    };


  useEffect(() => {
    loadPatients();
  }, []);


  // ==========================================================
  // COMPANIES
  // ==========================================================

  const [
    mysqlCompanies,
    setMysqlCompanies,
  ] = useState([]);

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState("ALL");

  const [
    showAddCompany,
    setShowAddCompany,
  ] = useState(false);

  const [
    newCompanyName,
    setNewCompanyName,
  ] = useState("");


  const loadCompanies =
    async () => {
      try {
        const response =
          await fetch(
            `${API_URL}/api/companies`
          );

        if (!response.ok) {
          throw new Error(
            "Unable to load companies."
          );
        }

        const result =
          await response.json();

        if (
          result.success &&
          Array.isArray(
            result.data
          )
        ) {
          setMysqlCompanies(
            result.data
              .map(
                (item) =>
                  item.name
              )
              .filter(Boolean)
          );
        }
      } catch (error) {
        console.error(
          "Error loading companies:",
          error
        );

        setMysqlCompanies([]);
      }
    };


  useEffect(() => {
    loadCompanies();
  }, []);


  // ==========================================================
  // COMPANY LIST
  // ==========================================================

  const companyList =
    useMemo(() => {

      const companies = [
        ...mysqlCompanies,

        ...icareData.map(
          (record) =>
            getValue(
              record,
              "company"
            )
        ),

        ...addedPatients.map(
          (record) =>
            record.company
        ),
      ];

      return [
        ...new Set(
          companies
            .map(
              (company) =>
                String(
                  company || ""
                ).trim()
            )
            .filter(Boolean)
        ),
      ].sort();

    }, [
      mysqlCompanies,
      icareData,
      addedPatients,
      getValue,
    ]);


  // ==========================================================
  // GENERAL STATES
  // ==========================================================

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    showAddPatient,
    setShowAddPatient,
  ] = useState(false);

  const [
    editingPatient,
    setEditingPatient,
  ] = useState(null);

  const [
    notification,
    setNotification,
  ] = useState(null);


  // ==========================================================
  // BULK DELETE
  // ==========================================================

  const [
    selectedPatientIds,
    setSelectedPatientIds,
  ] = useState([]);

  const [
    isDeletingSelected,
    setIsDeletingSelected,
  ] = useState(false);


  // ==========================================================
  // EMPTY PATIENT
  // ==========================================================

  const emptyPatient = {
    company: "",
    no: "",
    philhealthNo: "",
    lastName: "",
    firstName: "",
    middleName: "",
    dateOfBirth: "",
    address: "",
    age: "",
    contactNumber: "",
    pcu: "",
    registrationStatus:
      "PENDING",
    dateRegistered: "",
    fpe: "",
    remarks: "",
  };


  const [
    newPatient,
    setNewPatient,
  ] = useState(
    emptyPatient
  );


  // ==========================================================
  // BATCH STATES
  // ==========================================================

  const [
    showBatchUpload,
    setShowBatchUpload,
  ] = useState(false);

  const [
    batchFile,
    setBatchFile,
  ] = useState(null);

  const [
    batchRows,
    setBatchRows,
  ] = useState([]);

  const [
    batchDuplicates,
    setBatchDuplicates,
  ] = useState([]);

  const [
    batchErrors,
    setBatchErrors,
  ] = useState([]);

  const [
    isImporting,
    setIsImporting,
  ] = useState(false);

  const [
    batchMessage,
    setBatchMessage,
  ] = useState("");

  const [
    batchHistory,
    setBatchHistory,
  ] = useState([]);

  const [
    showBatchHistory,
    setShowBatchHistory,
  ] = useState(false);

  const [
    isDeletingBatch,
    setIsDeletingBatch,
  ] = useState(false);


  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  const showNotification =
    (
      type,
      title,
      message
    ) => {
      setNotification({
        type,
        title,
        message,
      });

      window.setTimeout(
        () => {
          setNotification(
            null
          );
        },
        4500
      );
    };


  // ==========================================================
  // ALL PATIENTS
  // ==========================================================

  const allPatients =
    useMemo(
      () =>
        addedPatients,
      [addedPatients]
    );


  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredIcareData =
    useMemo(() => {

      const searchText =
        String(search || "")
          .trim()
          .toLowerCase();

      return allPatients.filter(
        (record) => {

          const company =
            String(
              record.company || ""
            ).toLowerCase();

          const philhealthNo =
            String(
              record.philhealthNo ||
                ""
            ).toLowerCase();

          const lastName =
            String(
              record.lastName ||
                ""
            ).toLowerCase();

          const firstName =
            String(
              record.firstName ||
                ""
            ).toLowerCase();

          const middleName =
            String(
              record.middleName ||
                ""
            ).toLowerCase();

          const matchesCompany =
            selectedCompany ===
              "ALL" ||
            company ===
              selectedCompany.toLowerCase();

          const matchesSearch =
            !searchText ||
            philhealthNo.includes(
              searchText
            ) ||
            lastName.includes(
              searchText
            ) ||
            firstName.includes(
              searchText
            ) ||
            middleName.includes(
              searchText
            ) ||
            company.includes(
              searchText
            );

          return (
            matchesCompany &&
            matchesSearch
          );
        }
      );

    }, [
      allPatients,
      selectedCompany,
      search,
    ]);


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const totalEmployees =
    filteredIcareData.length;

  const totalRegistered =
    filteredIcareData.filter(
      (record) => {

        const status =
          String(
            record.registrationStatus ||
              ""
          )
            .trim()
            .toUpperCase();

        return (
          status ===
            "REGISTERED" ||
          status ===
            "COMPLETED"
        );
      }
    ).length;

  const noPhilhealth =
    filteredIcareData.filter(
      (record) =>
        !String(
          record.philhealthNo ||
            ""
        ).trim()
    ).length;

  const notRegistered =
    filteredIcareData.filter(
      (record) => {

        const status =
          String(
            record.registrationStatus ||
              ""
          )
            .trim()
            .toUpperCase();

        return (
          status !==
            "REGISTERED" &&
          status !==
            "COMPLETED"
        );
      }
    ).length;


  // ==========================================================
  // INPUT
  // ==========================================================

  const handleInputChange =
    (e) => {

      const {
        name,
        value,
      } = e.target;

      setNewPatient(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      );
    };


  // ==========================================================
  // ADD PATIENT
  // ==========================================================

  const handleAddPatient =
    () => {

      setEditingPatient(
        null
      );

      setNewPatient({
        ...emptyPatient,

        company:
          selectedCompany !==
          "ALL"
            ? selectedCompany
            : "",

        no:
          String(
            allPatients.length +
              1
          ),
      });

      setShowAddPatient(
        true
      );
    };


  // ==========================================================
  // SAVE PATIENT
  // ==========================================================

  const handleSavePatient =
    async () => {

      if (
        !String(
          newPatient.lastName ||
            ""
        ).trim()
      ) {
        alert(
          "Please enter Last Name."
        );

        return;
      }

      if (
        !String(
          newPatient.firstName ||
            ""
        ).trim()
      ) {
        alert(
          "Please enter First Name."
        );

        return;
      }


      const userEmail =
        getCurrentUserEmail();


      try {

        if (editingPatient) {

          const patientId =
            editingPatient.id;

          const payload = {
            ...editingPatient,
            ...newPatient,

            firebaseId:
              editingPatient.firebaseId ||
              (
                String(
                  editingPatient.id ||
                    ""
                ).startsWith(
                  "icare-"
                )
                  ? editingPatient.id
                  : null
              ),

            userEmail,
          };


          const response =
            await fetch(
              `${API_URL}/api/patients/${encodeURIComponent(
                patientId
              )}`,
              {
                method:
                  "PUT",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    payload
                  ),
              }
            );


          const result =
            await response.json();


          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Unable to update patient."
            );
          }


          const updated =
            result.data;


          setAddedPatients(
            (prev) =>
              prev.map(
                (patient) =>
                  String(
                    patient.id
                  ) ===
                  String(
                    editingPatient.id
                  )
                    ? updated
                    : patient
              )
          );


          await logAudit(
            "UPDATE",
            "ICARE",
            editingPatient.id,
            `${updated.lastName || ""}, ${updated.firstName || ""}`,
            "Patient updated.",
            userEmail
          );


          showNotification(
            "success",
            "Patient Updated",
            "Patient information was updated successfully."
          );

        } else {

          const patientId =
            createPatientId();

          const payload = {
            ...newPatient,

            id:
              patientId,

            no:
              newPatient.no ||
              String(
                allPatients.length +
                  1
              ),

            source:
              "mysql",

            firebaseId:
              patientId,

            userEmail,
          };


          const response =
            await fetch(
              `${API_URL}/api/patients`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    payload
                  ),
              }
            );


          const result =
            await response.json();


          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Unable to create patient."
            );
          }


          const created =
            result.data;


          setAddedPatients(
            (prev) => [
              created,
              ...prev,
            ]
          );


          await logAudit(
            "CREATE",
            "ICARE",
            created.id,
            `${created.lastName || ""}, ${created.firstName || ""}`,
            "Patient added.",
            userEmail
          );


          showNotification(
            "success",
            "Patient Added",
            "Patient was added successfully."
          );
        }


        setShowAddPatient(
          false
        );

        setEditingPatient(
          null
        );

        setNewPatient(
          emptyPatient
        );

      } catch (error) {

        console.error(
          "Error saving patient:",
          error
        );

        alert(
          error.message ||
            "Unable to save patient. Please try again."
        );
      }
    };


  // ==========================================================
  // EDIT
  // ==========================================================

  const handleEditPatient =
    (patient) => {

      if (!patient?.id) {
        alert(
          "This record cannot be edited here."
        );

        return;
      }

      setEditingPatient(
        patient
      );

      setNewPatient({
        ...emptyPatient,
        ...patient,
        dateOfBirth:
          formatApiDate(
            patient.dateOfBirth
          ),
        dateRegistered:
          formatApiDate(
            patient.dateRegistered
          ),
      });

      setShowAddPatient(
        true
      );
    };


  // ==========================================================
  // DELETE PATIENT
  // ==========================================================

  const handleDeletePatient =
    async (patient) => {

      if (!patient?.id) {
        alert(
          "This record cannot be deleted here."
        );

        return;
      }


      const confirmed =
        window.confirm(
          `Delete ${
            patient.lastName ||
            ""
          }, ${
            patient.firstName ||
            ""
          }?`
        );


      if (!confirmed) {
        return;
      }


      const userEmail =
        getCurrentUserEmail();


      try {

        // ----------------------------------------------------
        // FIRESTORE + MYSQL SAFETY BACKUP
        // ----------------------------------------------------

        const backupSuccess =
          await backupDeletedRecord(
            patient,
            userEmail
          );


        if (!backupSuccess) {
          alert(
            "Delete cancelled because the backup could not be completed."
          );

          return;
        }


        // ----------------------------------------------------
        // DELETE FROM MYSQL MAIN DATABASE
        // ----------------------------------------------------

        const response =
          await fetch(
            `${API_URL}/api/patients/${encodeURIComponent(
              patient.id
            )}`,
            {
              method:
                "DELETE",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  userEmail,
                }),
            }
          );


        const result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to delete patient."
          );
        }


        setAddedPatients(
          (prev) =>
            prev.filter(
              (item) =>
                String(
                  item.id
                ) !==
                String(
                  patient.id
                )
            )
        );


        setSelectedPatientIds(
          (prev) =>
            prev.filter(
              (id) =>
                String(id) !==
                String(patient.id)
            )
        );


        await logAudit(
          "DELETE",
          "ICARE",
          patient.id,
          `${patient.lastName || ""}, ${patient.firstName || ""}`,
          "Patient deleted.",
          userEmail
        );


        showNotification(
          "success",
          "Patient Deleted",
          "Patient was deleted and backed up successfully."
        );

      } catch (error) {

        console.error(
          "Error deleting patient:",
          error
        );

        alert(
          error.message ||
            "Unable to delete patient."
        );
      }
    };


  // ==========================================================
  // BULK SELECT
  // ==========================================================

  const allFilteredSelected =
    filteredIcareData.length >
      0 &&
    filteredIcareData.every(
      (patient) =>
        selectedPatientIds.includes(
          patient.id
        )
    );


  const toggleSelectPatient =
    (patientId) => {

      setSelectedPatientIds(
        (prev) => {

          const exists =
            prev.some(
              (id) =>
                String(id) ===
                String(patientId)
            );

          if (exists) {
            return prev.filter(
              (id) =>
                String(id) !==
                String(patientId)
            );
          }

          return [
            ...prev,
            patientId,
          ];
        }
      );
    };


  const toggleSelectAll =
    () => {

      if (
        allFilteredSelected
      ) {

        setSelectedPatientIds(
          (prev) =>
            prev.filter(
              (id) =>
                !filteredIcareData.some(
                  (patient) =>
                    String(
                      patient.id
                    ) ===
                    String(id)
                )
            )
        );

      } else {

        setSelectedPatientIds(
          (prev) => {

            const existing =
              new Set(
                prev.map(
                  String
                )
              );

            filteredIcareData.forEach(
              (patient) => {
                existing.add(
                  String(
                    patient.id
                  )
                );
              }
            );

            return [
              ...existing,
            ];
          }
        );
      }
    };


  // ==========================================================
  // BULK DELETE
  // ==========================================================

  const handleBulkDelete =
    async () => {

      if (
        selectedPatientIds.length ===
        0
      ) {
        alert(
          "Please select at least one patient."
        );

        return;
      }


      const selectedPatients =
        allPatients.filter(
          (patient) =>
            selectedPatientIds.some(
              (id) =>
                String(id) ===
                String(
                  patient.id
                )
            )
        );


      const confirmed =
        window.confirm(
          `Delete ${selectedPatients.length} selected patient(s)?\n\nAll selected records will be backed up before deletion.\n\nThis action cannot be undone.`
        );


      if (!confirmed) {
        return;
      }


      const userEmail =
        getCurrentUserEmail();


      setIsDeletingSelected(
        true
      );


      try {

        // ----------------------------------------------------
        // BACKUP EVERY RECORD FIRST
        // ----------------------------------------------------

        for (
          const patient of
          selectedPatients
        ) {

          const backupSuccess =
            await backupDeletedRecord(
              patient,
              userEmail
            );

          if (!backupSuccess) {
            throw new Error(
              `Backup failed for ${patient.lastName || ""}, ${patient.firstName || ""}. Deletion was stopped.`
            );
          }
        }


        // ----------------------------------------------------
        // MYSQL BULK DELETE
        // ----------------------------------------------------

        const response =
          await fetch(
            `${API_URL}/api/patients/bulk-delete`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  ids:
                    selectedPatients.map(
                      (patient) =>
                        patient.id
                    ),

                  userEmail,
                }),
            }
          );


        const result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Bulk delete failed."
          );
        }


        // ----------------------------------------------------
// REFRESH PATIENT LIST AFTER BULK DELETE
// ----------------------------------------------------

// Remove deleted records immediately from the current page
const deletedSet =
  new Set(
    selectedPatients.map(
      (patient) =>
        String(patient.id)
    )
  );

setAddedPatients(
  (prev) =>
    prev.filter(
      (patient) =>
        !deletedSet.has(
          String(patient.id)
        )
    )
);

// Reload the latest records from MySQL
await loadPatients();


for (
  const patient of
  selectedPatients
) {

          await logAudit(
            "DELETE",
            "ICARE",
            patient.id,
            `${patient.lastName || ""}, ${patient.firstName || ""}`,
            "Patient deleted through bulk delete.",
            userEmail
          );
        }


        setSelectedPatientIds(
          []
        );


        showNotification(
          "success",
          "Patients Deleted",
          `${selectedPatients.length} patient(s) were deleted and backed up successfully.`
        );

      } catch (error) {

        console.error(
          "Bulk delete error:",
          error
        );

        alert(
          error.message ||
            "Unable to delete selected patients."
        );

      } finally {

        setIsDeletingSelected(
          false
        );
      }
    };


  // ==========================================================
  // EXCEL DATE
  // ==========================================================

  const formatExcelDate =
    (value) => {

      if (!value) {
        return "";
      }


      if (
        value instanceof Date &&
        !Number.isNaN(
          value.getTime()
        )
      ) {

        const year =
          value.getFullYear();

        const month =
          String(
            value.getMonth() + 1
          ).padStart(2, "0");

        const day =
          String(
            value.getDate()
          ).padStart(2, "0");

        return `${year}-${month}-${day}`;
      }


      if (
        typeof value ===
        "number"
      ) {

        const parsed =
          XLSX.SSF.parse_date_code(
            value
          );

        if (parsed) {

          return `${parsed.y}-${String(
            parsed.m
          ).padStart(2, "0")}-${String(
            parsed.d
          ).padStart(2, "0")}`;
        }
      }


      const text =
        String(value).trim();

      if (!text) {
        return "";
      }


      const date =
        new Date(text);

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {

        return `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(
          date.getDate()
        ).padStart(2, "0")}`;
      }


      return text;
    };


  // ==========================================================
  // CLOSE BATCH
  // ==========================================================

  const closeBatchUpload =
    () => {

      if (isImporting) {
        return;
      }

      setShowBatchUpload(
        false
      );

      setBatchFile(null);
      setBatchRows([]);
      setBatchDuplicates([]);
      setBatchErrors([]);
      setBatchMessage("");
    };


  // ==========================================================
  // LOAD BATCH HISTORY
  // ==========================================================

  const loadBatchHistory =
    async () => {

      try {

        const response =
          await fetch(
            `${API_URL}/api/icare-batches`
          );

        if (!response.ok) {
          throw new Error(
            "Unable to load batch history."
          );
        }

        const result =
          await response.json();

        if (
          result.success &&
          Array.isArray(
            result.data
          )
        ) {

          setBatchHistory(
            result.data
          );

        } else {

          setBatchHistory([]);
        }

      } catch (error) {

        console.error(
          "Error loading batch history:",
          error
        );

        setBatchHistory([]);
      }
    };


  useEffect(() => {
    loadBatchHistory();
  }, []);


  // ==========================================================
  // BATCH FILE CHANGE
  // ==========================================================

  const handleBatchFileChange =
    async (e) => {

      const file =
        e.target.files?.[0];

      if (!file) {
        return;
      }


      setBatchFile(file);
      setBatchRows([]);
      setBatchDuplicates([]);
      setBatchErrors([]);
      setBatchMessage("");


      try {

        const arrayBuffer =
          await file.arrayBuffer();

        const workbook =
          XLSX.read(
            arrayBuffer,
            {
              type: "array",
              cellDates: true,
            }
          );


        if (
          !workbook.SheetNames ||
          workbook.SheetNames.length ===
            0
        ) {

          setBatchErrors([
            "The Excel file does not contain any worksheet.",
          ]);

          return;
        }


        const sheetName =
          workbook.SheetNames[0];

        const worksheet =
          workbook.Sheets[
            sheetName
          ];


        const rawRows =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              header: 1,
              defval: "",
              raw: true,
            }
          );


        if (
          !rawRows ||
          rawRows.length ===
            0
        ) {

          setBatchErrors([
            "The Excel file is empty.",
          ]);

          return;
        }


        const normalizeHeader =
          (value) => {

            return String(
              value || ""
            )
              .trim()
              .toUpperCase()
              .replace(
                /\s+/g,
                " "
              )
              .replace(
                /[.]/g,
                "");
          };


        let headerIndex = -1;


        for (
          let i = 0;
          i <
          Math.min(
            rawRows.length,
            20
          );
          i++
        ) {

          const row =
            rawRows[i] || [];

          const headers =
            row.map(
              normalizeHeader
            );


          const hasCompany =
            headers.includes(
              "COMPANY"
            );

          const hasPhilhealth =
            headers.includes(
              "PHILHEALTH NO"
            );

          const hasLastName =
            headers.includes(
              "LAST NAME"
            );

          const hasFirstName =
            headers.includes(
              "FIRST NAME"
            );


          if (
            hasCompany &&
            hasPhilhealth &&
            hasLastName &&
            hasFirstName
          ) {

            headerIndex =
              i;

            break;
          }
        }


        if (
          headerIndex ===
          -1
        ) {

          setBatchErrors([
            "Unable to find the required Excel headers. Required columns are: COMPANY, NO., PHILHEALTH NO., LAST NAME, FIRST NAME, MIDDLE NAME, DATE OF BIRTH, ADDRESS, PCU, REGISTRATION STATUS, DATE REGISTERED and FPE.",
          ]);

          return;
        }


        const headerRow =
          rawRows[
            headerIndex
          ] || [];


        const headerMap =
          {};


        headerRow.forEach(
          (
            header,
            index
          ) => {

            const normalized =
              normalizeHeader(
                header
              );

            if (normalized) {
              headerMap[
                normalized
              ] = index;
            }
          }
        );


        const getColumn =
          (
            row,
            ...names
          ) => {

            for (
              const name of
              names
            ) {

              const index =
                headerMap[
                  normalizeHeader(
                    name
                  )
                ];


              if (
                index !==
                undefined
              ) {

                return row[
                  index
                ];
              }
            }

            return "";
          };


        const dataRows =
          rawRows.slice(
            headerIndex + 1
          );


        const currentPhilhealth =
          new Set(
            allPatients
              .map(
                (patient) =>
                  normalizePhilhealth(
                    patient.philhealthNo
                  )
              )
              .filter(Boolean)
          );


        const seenInFile =
          new Set();


        const validRows =
          [];

        const duplicates =
          [];

        const errors =
          [];


        dataRows.forEach(
          (
            row,
            index
          ) => {

            const excelRowNumber =
              headerIndex +
              index +
              2;


            const company =
              String(
                getColumn(
                  row,
                  "COMPANY"
                ) || ""
              ).trim();


            const noValue =
              getColumn(
                row,
                "NO"
              );


            const no =
              noValue !==
                undefined &&
              noValue !==
                null
                ? String(
                    noValue
                  ).replace(
                    /\.0$/,
                    ""
                  )
                : "";


            const philhealthNo =
              normalizePhilhealth(
                getColumn(
                  row,
                  "PHILHEALTH NO"
                )
              );


            const lastName =
              String(
                getColumn(
                  row,
                  "LAST NAME"
                ) || ""
              ).trim();


            const firstName =
              String(
                getColumn(
                  row,
                  "FIRST NAME"
                ) || ""
              ).trim();


            const middleName =
              String(
                getColumn(
                  row,
                  "MIDDLE NAME"
                ) || ""
              ).trim();


            const dateOfBirth =
              formatExcelDate(
                getColumn(
                  row,
                  "DATE OF BIRTH"
                )
              );


            const address =
              String(
                getColumn(
                  row,
                  "ADDRESS"
                ) || ""
              ).trim();


            const ageValue =
              getColumn(
                row,
                "AGE"
              );


            const age =
              ageValue ===
                "" ||
              ageValue ===
                null ||
              ageValue ===
                undefined
                ? ""
                : String(
                    ageValue
                  ).replace(
                    /\.0$/,
                    ""
                  );


            const contactNumber =
              String(
                getColumn(
                  row,
                  "CONTACT NUMBER"
                ) || ""
              ).trim();


            const pcu =
              String(
                getColumn(
                  row,
                  "PCU"
                ) || ""
              ).trim();


            const registrationStatus =
              String(
                getColumn(
                  row,
                  "REGISTRATION STATUS"
                ) ||
                  "PENDING"
              ).trim() ||
              "PENDING";


            const dateRegistered =
              formatExcelDate(
                getColumn(
                  row,
                  "DATE REGISTERED"
                )
              );


            const fpe =
              String(
                getColumn(
                  row,
                  "FPE"
                ) || ""
              ).trim();


            const remarks =
              String(
                getColumn(
                  row,
                  "REMARKS"
                ) || ""
              ).trim();


            const isEmptyRow =
              !company &&
              !philhealthNo &&
              !lastName &&
              !firstName;


            if (
              isEmptyRow
            ) {
              return;
            }


            if (
              !lastName ||
              !firstName
            ) {

              errors.push({
                row:
                  excelRowNumber,

                reason:
                  "Missing Last Name or First Name.",

                name:
                  `${lastName}, ${firstName}`,
              });

              return;
            }


            if (
              philhealthNo &&
              currentPhilhealth.has(
                philhealthNo
              )
            ) {

              duplicates.push({
                row:
                  excelRowNumber,

                reason:
                  "PhilHealth No. already exists in the system.",

                philhealthNo,

                name:
                  `${lastName}, ${firstName}`,
              });

              return;
            }


            if (
              philhealthNo &&
              seenInFile.has(
                philhealthNo
              )
            ) {

              duplicates.push({
                row:
                  excelRowNumber,

                reason:
                  "Duplicate PhilHealth No. found in this Excel file.",

                philhealthNo,

                name:
                  `${lastName}, ${firstName}`,
              });

              return;
            }


            if (
              philhealthNo
            ) {

              seenInFile.add(
                philhealthNo
              );
            }


            validRows.push({
              company,
              no,
              philhealthNo,
              lastName,
              firstName,
              middleName,
              dateOfBirth,
              address,
              age,
              contactNumber,
              pcu,
              registrationStatus,
              dateRegistered,
              fpe,
              remarks,
            });
          }
        );


        setBatchRows(
          validRows
        );

        setBatchDuplicates(
          duplicates
        );

        setBatchErrors(
          errors
        );

        setBatchMessage(
          `Ready to import ${validRows.length} new patient(s).`
        );


        console.log(
          "Excel Sheet:",
          sheetName
        );

        console.log(
          "Excel Total Rows:",
          rawRows.length
        );

        console.log(
          "Detected Header Row:",
          headerIndex + 1
        );

        console.log(
          "VALID PATIENTS:",
          validRows.length
        );

        console.log(
          "DUPLICATES:",
          duplicates.length
        );

        console.log(
          "ERRORS:",
          errors.length
        );

      } catch (error) {

        console.error(
          "Error reading Excel file:",
          error
        );

        setBatchErrors([
          "Unable to read the Excel file. Please make sure it is a valid .xlsx or .xls file.",
        ]);
      }
    };


  // ==========================================================
  // BATCH IMPORT
  // ==========================================================

  const handleBatchImport =
    async () => {

      if (
        !batchRows.length
      ) {

        alert(
          "There are no new patient records to import."
        );

        return;
      }


      const confirmed =
        window.confirm(
          `Import ${batchRows.length} new patient(s) into MySQL?\n\nDuplicate records will NOT be overwritten.`
        );


      if (!confirmed) {
        return;
      }


      setIsImporting(
        true
      );

      setBatchMessage(
        "Importing patients to MySQL..."
      );


      const userEmail =
        getCurrentUserEmail();


      try {

        const batchId =
          "batch-" +
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .substring(2, 8);


        const batchFileName =
          batchFile?.name ||
          "Unknown File";


        const batchUploadedAt =
          new Date().toISOString();


        const rowsWithIds =
          batchRows.map(
            (
              patient,
              index
            ) => ({
              ...patient,

              id:
                createPatientId(
                  index
                ),

              source:
                "batch-upload",

              batchId,

              batchFileName,

              batchUploadedAt,
            })
          );


        const response =
          await fetch(
            `${API_URL}/api/icare-batches/import`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  batchId,

                  fileName:
                    batchFileName,

                  uploadedAt:
                    batchUploadedAt,

                  uploadedBy:
                    userEmail,

                  patients:
                    rowsWithIds,
                }),
            }
          );


        const result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Batch import failed."
          );
        }


        setBatchMessage(
          `Successfully imported ${result.importedCount} patient(s).`
        );


        await logAudit(
          "BATCH_IMPORT",
          "ICARE",
          batchId,
          batchFileName,
          `${result.importedCount} patient(s) imported.`,
          userEmail
        );


        await loadPatients();
        await loadBatchHistory();


        alert(
          `Batch upload completed successfully!\n\n${result.importedCount} new patient(s) were added to MySQL.`
        );


        setBatchFile(null);
        setBatchRows([]);
        setBatchDuplicates([]);
        setBatchErrors([]);

      } catch (error) {

        console.error(
          "Batch import error:",
          error
        );

        setBatchMessage(
          ""
        );

        alert(
          error.message ||
            "Batch upload failed."
        );

      } finally {

        setIsImporting(
          false
        );
      }
    };


  // ==========================================================
  // DELETE BATCH
  // ==========================================================

  const handleDeleteBatch =
    async (batch) => {

      if (!batch?.id) {
        return;
      }


      const confirmed =
        window.confirm(
          `DELETE BATCH?\n\n` +
          `File: ${
            batch.fileName ||
            "Unknown File"
          }\n` +
          `Patients: ${
            batch.patientCount ||
            0
          }\n\n` +
          `All patients imported from this batch will be permanently deleted from the system.\n\n` +
          `This action cannot be undone.`
        );


      if (!confirmed) {
        return;
      }


      const userEmail =
        getCurrentUserEmail();


      setIsDeletingBatch(
        true
      );


      try {

        // ----------------------------------------------------
        // GET PATIENTS FROM CURRENT MYSQL DATA
        // ----------------------------------------------------

        const batchPatients =
          allPatients.filter(
            (patient) =>
              String(
                patient.batchId ||
                  ""
              ) ===
              String(
                batch.batchId ||
                  batch.id
              )
          );


        // ----------------------------------------------------
        // BACKUP EACH PATIENT
        // ----------------------------------------------------

        for (
          const patient of
          batchPatients
        ) {

          const backupSuccess =
            await backupDeletedRecord(
              patient,
              userEmail
            );

          if (!backupSuccess) {
            throw new Error(
              `Backup failed for ${patient.lastName || ""}, ${patient.firstName || ""}. Batch deletion was stopped.`
            );
          }
        }


        // ----------------------------------------------------
        // DELETE BATCH FROM MYSQL
        // ----------------------------------------------------

        const response =
          await fetch(
            `${API_URL}/api/icare-batches/${encodeURIComponent(
              batch.id
            )}`,
            {
              method:
                "DELETE",

              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );


        const result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to delete batch."
          );
        }


        await logAudit(
          "BATCH_DELETE",
          "ICARE",
          batch.id,
          batch.fileName ||
            "Unknown File",
          `${result.deletedCount || 0} patient(s) deleted from batch.`,
          userEmail
        );


        await loadPatients();
        await loadBatchHistory();


        alert(
          `Batch deleted successfully!\n\n${
            result.deletedCount ||
            0
          } patient(s) were removed.`
        );

      } catch (error) {

        console.error(
          "Error deleting batch:",
          error
        );

        alert(
          error.message ||
            "Unable to delete batch. Please try again."
        );

      } finally {

        setIsDeletingBatch(
          false
        );
      }
    };


  // ==========================================================
  // ADD COMPANY
  // ==========================================================

  const handleAddCompany =
    async () => {

      const companyName =
        String(
          newCompanyName || ""
        ).trim();


      if (!companyName) {

        alert(
          "Please enter a company name."
        );

        return;
      }


      const userEmail =
        getCurrentUserEmail();


      try {

        const response =
          await fetch(
            `${API_URL}/api/companies`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name:
                    companyName,

                  createdBy:
                    userEmail,
                }),
            }
          );


        const result =
          await response.json();


        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to add company."
          );
        }


        setSelectedCompany(
          companyName
        );

        setNewCompanyName(
          ""
        );

        setShowAddCompany(
          false
        );


        await loadCompanies();


        await logAudit(
          "CREATE",
          "COMPANY",
          result.data?.id ||
            companyName,
          companyName,
          "Company added.",
          userEmail
        );


        showNotification(
          "success",
          "Company Added",
          `${companyName} was added successfully.`
        );

      } catch (error) {

        console.error(
          "Error adding company:",
          error
        );

        alert(
          error.message ||
            "Unable to add company."
        );
      }
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="icare-page">

      <div className="icare-page-header">

        <div className="icare-title-area">

          <h1>
            EMPLOYEE REGISTRATION MONITORING
          </h1>

          <p>
            1LIFE YAKAP PROVIDER
          </p>

        </div>

      </div>


      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <div className="icare-toolbar">

        <div className="icare-search-box">

          <span className="icare-search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search PhilHealth No. / Last Name / First Name"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>


        <div className="icare-company-row">

          <div className="icare-company-selector">

            <label>
              COMPANY
            </label>

            <select
              value={
                selectedCompany
              }
              onChange={(e) =>
                setSelectedCompany(
                  e.target.value
                )
              }
            >

              <option value="ALL">
                ALL COMPANIES
              </option>

              {companyList.map(
                (company) => (

                  <option
                    key={company}
                    value={company}
                  >
                    {company}
                  </option>

                )
              )}

            </select>

          </div>


          <button
            type="button"
            className="icare-add-company-button"
            onClick={() =>
              setShowAddCompany(
                true
              )
            }
          >
            + Add
          </button>

        </div>

      </div>


      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="icare-summary-grid">

        <div className="icare-summary-card">

          <div className="icare-summary-icon">
            👥
          </div>

          <div>

            <span>
              TOTAL EMPLOYEES
            </span>

            <strong>
              {totalEmployees}
            </strong>

          </div>

        </div>


        <div className="icare-summary-card">

          <div className="icare-summary-icon registered">
            ✓
          </div>

          <div>

            <span>
              TOTAL REGISTERED
            </span>

            <strong className="registered-number">
              {totalRegistered}
            </strong>

          </div>

        </div>


        <div className="icare-summary-card">

          <div className="icare-summary-icon philhealth">
            #
          </div>

          <div>

            <span>
              NO PHILHEALTH NO.
            </span>

            <strong>
              {noPhilhealth}
            </strong>

          </div>

        </div>


        <div className="icare-summary-card">

          <div className="icare-summary-icon not-registered">
            !
          </div>

          <div>

            <span>
              NOT REGISTERED
            </span>

            <strong className="not-registered-number">
              {notRegistered}
            </strong>

          </div>

        </div>

      </div>


      {/* ======================================================
          TABLE PANEL
      ====================================================== */}

      <div className="icare-table-panel">

        <div className="icare-table-title">

          <div>

            <h2>
              ICARE REGISTRATION LIST
            </h2>

            <p>
              Employee registration monitoring
            </p>

          </div>


          <div className="icare-table-actions">

            {selectedPatientIds.length >
              0 && (

              <button
                type="button"
                className="delete-patient-button"
                onClick={
                  handleBulkDelete
                }
                disabled={
                  isDeletingSelected
                }
              >
                🗑️{" "}
                {isDeletingSelected
                  ? "DELETING..."
                  : `DELETE SELECTED (${selectedPatientIds.length})`}
              </button>

            )}


            <div className="icare-record-count">
              {filteredIcareData.length} Records
            </div>


            <button
              type="button"
              className="table-batch-button"
              onClick={() => {

                setShowBatchUpload(
                  true
                );

                setBatchMessage(
                  ""
                );

              }}
            >
              📥 BATCH UPLOAD
            </button>


            <button
              type="button"
              className="table-batch-button"
              onClick={() => {

                setShowBatchHistory(
                  true
                );

                loadBatchHistory();

              }}
            >
              📋 BATCH HISTORY
            </button>


            <button
              type="button"
              className="table-add-button"
              onClick={
                handleAddPatient
              }
            >

              <span className="add-icon">
                +
              </span>

              Add Patient

            </button>

          </div>

        </div>


        <div className="icare-table-wrapper">

          <table className="icare-table">

            <thead>

              <tr>

                <th>
                  <input
                    type="checkbox"
                    checked={
                      allFilteredSelected
                    }
                    onChange={
                      toggleSelectAll
                    }
                    disabled={
                      filteredIcareData.length ===
                      0
                    }
                  />
                </th>

                <th>
                  COMPANY
                </th>

                <th>
                  NO.
                </th>

                <th>
                  PHILHEALTH NO.
                </th>

                <th>
                  LAST NAME
                </th>

                <th>
                  FIRST NAME
                </th>

                <th>
                  MIDDLE NAME
                </th>

                <th>
                  DATE OF BIRTH
                </th>

                <th>
                  ADDRESS
                </th>

                <th>
                  AGE
                </th>

                <th>
                  CONTACT NUMBER
                </th>

                <th>
                  PCU
                </th>

                <th>
                  REGISTRATION STATUS
                </th>

                <th>
                  DATE REGISTERED
                </th>

                <th>
                  FPE
                </th>

                <th>
                  REMARKS
                </th>

                <th>
                  ACTION
                </th>

              </tr>

            </thead>


            <tbody>

              {isLoadingPatients ? (

                <tr>

                  <td
                    colSpan="17"
                    className="icare-no-data"
                  >

                    <div className="icare-no-data-icon">
                      ⏳
                    </div>

                    <strong>
                      Loading patient records...
                    </strong>

                  </td>

                </tr>

              ) : filteredIcareData.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="17"
                    className="icare-no-data"
                  >

                    <div className="icare-no-data-icon">
                      📋
                    </div>

                    <strong>
                      No patient records found
                    </strong>

                    <p>
                      Add a patient or upload an Excel file.
                    </p>

                  </td>

                </tr>

              ) : (

                filteredIcareData.map(
                  (patient) => {

                    const isSelected =
                      selectedPatientIds.some(
                        (id) =>
                          String(id) ===
                          String(
                            patient.id
                          )
                      );


                    const registrationStatus =
                      String(
                        patient.registrationStatus ||
                          ""
                      ).toUpperCase();


                    return (

                      <tr
                        key={
                          patient.id
                        }
                      >

                        <td>

                          <input
                            type="checkbox"
                            checked={
                              isSelected
                            }
                            onChange={() =>
                              toggleSelectPatient(
                                patient.id
                              )
                            }
                          />

                        </td>


                        <td>
                          {
                            patient.company ||
                            "-"
                          }
                        </td>


                        <td>
                          {
                            patient.no ||
                            "-"
                          }
                        </td>


                        <td className="philhealth-cell">
                          {
                            patient.philhealthNo ||
                            "-"
                          }
                        </td>


                        <td className="name-cell">
                          {
                            patient.lastName ||
                            "-"
                          }
                        </td>


                        <td className="name-cell">
                          {
                            patient.firstName ||
                            "-"
                          }
                        </td>


                        <td>
                          {
                            patient.middleName ||
                            "-"
                          }
                        </td>


                        <td>
                          {
                            patient.dateOfBirth ||
                            "-"
                          }
                        </td>


                        <td className="address-cell">
                          {
                            patient.address ||
                            "-"
                          }
                        </td>


                        <td>
                          {
                            patient.age ||
                            "-"
                          }
                        </td>


                        <td>
                          {
                            patient.contactNumber ||
                            "-"
                          }
                        </td>


                        <td>

                          <span
                            className={
                              String(
                                patient.pcu ||
                                  ""
                              ).toUpperCase() ===
                              "YES"
                                ? "pcu-badge pcu-yes"
                                : "pcu-badge"
                            }
                          >
                            {
                              patient.pcu ||
                              "-"
                            }
                          </span>

                        </td>


                        <td>

                          <span
                            className={
                              registrationStatus ===
                                "REGISTERED" ||
                              registrationStatus ===
                                "COMPLETED"
                                ? "icare-status registered"
                                : "icare-status pending"
                            }
                          >
                            {
                              patient.registrationStatus ||
                              "-"
                            }
                          </span>

                        </td>


                        <td>
                          {
                            patient.dateRegistered ||
                            "-"
                          }
                        </td>


                        <td>

                          <span className="fpe-badge">
                            {
                              patient.fpe ||
                              "-"
                            }
                          </span>

                        </td>


                        <td className="remarks-cell">
                          {
                            patient.remarks ||
                            "-"
                          }
                        </td>


                        <td>

                          <div className="patient-action-buttons">

                            <button
                              type="button"
                              className="edit-patient-button"
                              onClick={() =>
                                handleEditPatient(
                                  patient
                                )
                              }
                              aria-label="Edit patient"
                            >
                              ✏️
                            </button>


                            <button
                              type="button"
                              className="delete-patient-button"
                              onClick={() =>
                                handleDeletePatient(
                                  patient
                                )
                              }
                              aria-label="Delete patient"
                            >
                              🗑️
                            </button>

                          </div>

                        </td>

                      </tr>

                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* ======================================================
          ADD / EDIT PATIENT MODAL
      ====================================================== */}

      {showAddPatient && (

        <div className="add-patient-modal">

          <div className="add-patient-modal-content">

            <div className="add-patient-header">

              <div>

                <h2>
                  {editingPatient
                    ? "EDIT PATIENT"
                    : "ADD PATIENT"}
                </h2>

                <p>
                  {editingPatient
                    ? "Update employee registration details"
                    : "Enter employee registration details"}
                </p>

              </div>


              <button
                type="button"
                className="add-patient-close"
                onClick={() => {

                  setShowAddPatient(
                    false
                  );

                  setEditingPatient(
                    null
                  );

                  setNewPatient(
                    emptyPatient
                  );

                }}
              >
                ×
              </button>

            </div>


            <div className="add-patient-form">

              <div className="add-patient-section">

                <div className="add-patient-section-header">

                  <span className="add-patient-section-number">
                    1
                  </span>

                  <div>

                    <h3>
                      Personal Information
                    </h3>

                    <p>
                      Employee basic information
                    </p>

                  </div>

                </div>


                <div className="add-patient-grid">

                  <div className="add-patient-field">

                    <label>
                      COMPANY
                    </label>

                    <select
                      name="company"
                      value={
                        newPatient.company
                      }
                      onChange={
                        handleInputChange
                      }
                    >

                      <option value="">
                        Select Company
                      </option>

                      {companyList.map(
                        (company) => (

                          <option
                            key={
                              company
                            }
                            value={
                              company
                            }
                          >
                            {
                              company
                            }
                          </option>

                        )
                      )}

                    </select>

                  </div>


                  <div className="add-patient-field">

                    <label>
                      NO.
                    </label>

                    <input
                      type="text"
                      name="no"
                      value={
                        newPatient.no
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Employee No."
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      PHILHEALTH NO.
                    </label>

                    <input
                      type="text"
                      name="philhealthNo"
                      value={
                        newPatient.philhealthNo
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="PhilHealth Number"
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      LAST NAME
                    </label>

                    <input
                      type="text"
                      name="lastName"
                      value={
                        newPatient.lastName
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Last Name"
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      FIRST NAME
                    </label>

                    <input
                      type="text"
                      name="firstName"
                      value={
                        newPatient.firstName
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="First Name"
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      MIDDLE NAME
                    </label>

                    <input
                      type="text"
                      name="middleName"
                      value={
                        newPatient.middleName
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Middle Name"
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      DATE OF BIRTH
                    </label>

                    <input
                      type="date"
                      name="dateOfBirth"
                      value={
                        newPatient.dateOfBirth ||
                        ""
                      }
                      onChange={
                        handleInputChange
                      }
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      ADDRESS
                    </label>

                    <textarea
                      name="address"
                      value={
                        newPatient.address
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Complete Address"
                      rows="3"
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      AGE
                    </label>

                    <input
                      type="number"
                      name="age"
                      value={
                        newPatient.age ||
                        ""
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Age"
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      CONTACT NUMBER
                    </label>

                    <input
                      type="text"
                      name="contactNumber"
                      value={
                        newPatient.contactNumber ||
                        ""
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Contact Number"
                    />

                  </div>

                </div>

              </div>


              <div className="add-patient-section">

                <div className="add-patient-section-header">

                  <span className="add-patient-section-number">
                    2
                  </span>

                  <div>

                    <h3>
                      Registration Information
                    </h3>

                    <p>
                      YAKAP registration details
                    </p>

                  </div>

                </div>


                <div className="add-patient-grid">

                  <div className="add-patient-field">

                    <label>
                      PCU
                    </label>

                    <select
                      name="pcu"
                      value={
                        newPatient.pcu
                      }
                      onChange={
                        handleInputChange
                      }
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="YES">
                        YES
                      </option>

                      <option value="NO">
                        NO
                      </option>

                    </select>

                  </div>


                  <div className="add-patient-field">

                    <label>
                      REGISTRATION STATUS
                    </label>

                    <select
                      name="registrationStatus"
                      value={
                        newPatient.registrationStatus
                      }
                      onChange={
                        handleInputChange
                      }
                    >

                      <option value="PENDING">
                        PENDING
                      </option>

                      <option value="REGISTERED">
                        REGISTERED
                      </option>

                      <option value="COMPLETED">
                        COMPLETED
                      </option>

                      <option value="NOT REGISTERED">
                        NOT REGISTERED
                      </option>

                    </select>

                  </div>


                  <div className="add-patient-field">

                    <label>
                      DATE REGISTERED
                    </label>

                    <input
                      type="date"
                      name="dateRegistered"
                      value={
                        newPatient.dateRegistered ||
                        ""
                      }
                      onChange={
                        handleInputChange
                      }
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      FPE
                    </label>

                    <select
                      name="fpe"
                      value={
                        newPatient.fpe
                      }
                      onChange={
                        handleInputChange
                      }
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="DONE">
                        DONE
                      </option>

                      <option value="PENDING">
                        PENDING
                      </option>

                      <option value="NOT YET">
                        NOT YET
                      </option>

                    </select>

                  </div>


                  <div className="add-patient-field">

                    <label>
                      REMARKS
                    </label>

                    <textarea
                      name="remarks"
                      value={
                        newPatient.remarks
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Additional remarks"
                      rows="3"
                    />

                  </div>

                </div>

              </div>

            </div>


            <div className="add-patient-footer">

              <button
                type="button"
                className="add-patient-cancel"
                onClick={() => {

                  setShowAddPatient(
                    false
                  );

                  setEditingPatient(
                    null
                  );

                  setNewPatient(
                    emptyPatient
                  );

                }}
              >
                CANCEL
              </button>


              <button
                type="button"
                className="add-patient-save"
                onClick={
                  handleSavePatient
                }
              >
                {editingPatient
                  ? "UPDATE PATIENT"
                  : "SAVE PATIENT"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          BATCH UPLOAD MODAL
      ====================================================== */}

      {showBatchUpload && (

        <div className="add-patient-modal">

          <div className="add-patient-modal-content icare-batch-modal">

            <div className="add-patient-header">

              <div>

                <h2>
                  BATCH UPLOAD
                </h2>

                <p>
                  Upload employee records from an Excel file
                </p>

              </div>


              <button
                type="button"
                className="add-patient-close"
                onClick={
                  closeBatchUpload
                }
                disabled={
                  isImporting
                }
              >
                ×
              </button>

            </div>


            <div className="add-patient-form">

              <div className="add-patient-section">

                <div className="add-patient-section-header">

                  <span className="add-patient-section-number">
                    1
                  </span>

                  <div>

                    <h3>
                      Select Excel File
                    </h3>

                    <p>
                      Upload the ICARE employee monitoring file
                    </p>

                  </div>

                </div>


                <div className="batch-upload-area">

                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={
                      handleBatchFileChange
                    }
                    disabled={
                      isImporting
                    }
                  />


                  {batchFile && (

                    <div className="batch-selected-file">

                      <span>
                        📄
                      </span>

                      <div>

                        <strong>
                          {
                            batchFile.name
                          }
                        </strong>

                        <small>
                          {(
                            batchFile.size /
                            1024
                          ).toFixed(1)} KB
                        </small>

                      </div>

                    </div>

                  )}

                </div>


                <div className="batch-upload-note">
                  <strong></strong>
                  <span></span>
                </div>

              </div>


              {batchFile && (

                <div className="add-patient-section">

                  <div className="add-patient-section-header">

                    <span className="add-patient-section-number">
                      2
                    </span>

                    <div>

                      <h3>
                        Import Preview
                      </h3>

                      <p>
                        Review the records before importing
                      </p>

                    </div>

                  </div>


                  <div className="batch-summary-grid">

                    <div className="batch-summary-card">

                      <span>
                        NEW PATIENTS
                      </span>

                      <strong>
                        {
                          batchRows.length
                        }
                      </strong>

                    </div>


                    <div className="batch-summary-card">

                      <span>
                        DUPLICATES
                      </span>

                      <strong>
                        {
                          batchDuplicates.length
                        }
                      </strong>

                    </div>


                    <div className="batch-summary-card">

                      <span>
                        ERRORS
                      </span>

                      <strong>
                        {
                          batchErrors.length
                        }
                      </strong>

                    </div>

                  </div>


                  {batchMessage && (

                    <div className="batch-upload-message">
                      {
                        batchMessage
                      }
                    </div>

                  )}


                  {batchDuplicates.length >
                    0 && (

                    <div className="batch-result-section">

                      <h4>
                        Duplicate Records
                      </h4>

                      <div className="batch-result-list">

                        {batchDuplicates
                          .slice(0, 20)
                          .map(
                            (
                              duplicate,
                              index
                            ) => (

                              <div
                                key={
                                  index
                                }
                                className="batch-result-item duplicate"
                              >

                                <span>
                                  Row{" "}
                                  {
                                    duplicate.row
                                  }
                                </span>

                                <strong>
                                  {
                                    duplicate.name
                                  }
                                </strong>

                                <small>
                                  PhilHealth No.:{" "}
                                  {
                                    duplicate.philhealthNo ||
                                    "-"
                                  }
                                </small>

                                <em>
                                  {
                                    duplicate.reason
                                  }
                                </em>

                              </div>

                            )
                          )}

                      </div>


                      {batchDuplicates.length >
                        20 && (

                        <p className="batch-more-text">

                          +{" "}
                          {
                            batchDuplicates.length -
                            20
                          }{" "}
                          more duplicate record(s)

                        </p>

                      )}

                    </div>

                  )}


                  {batchErrors.length >
                    0 && (

                    <div className="batch-result-section">

                      <h4>
                        Records With Errors
                      </h4>

                      <div className="batch-result-list">

                        {batchErrors
                          .slice(0, 20)
                          .map(
                            (
                              error,
                              index
                            ) => (

                              <div
                                key={
                                  index
                                }
                                className="batch-result-item error"
                              >

                                <span>
                                  Row{" "}
                                  {
                                    error.row
                                  }
                                </span>

                                <strong>
                                  {
                                    error.name ||
                                    "Unnamed record"
                                  }
                                </strong>

                                <em>
                                  {
                                    error.reason
                                  }
                                </em>

                              </div>

                            )
                          )}

                      </div>


                      {batchErrors.length >
                        20 && (

                        <p className="batch-more-text">

                          +{" "}
                          {
                            batchErrors.length -
                            20
                          }{" "}
                          more record(s) with errors

                        </p>

                      )}

                    </div>

                  )}


                  {batchRows.length >
                    0 && (

                    <div className="batch-preview-section">

                      <h4>
                        New Patients Preview
                      </h4>


                      <div className="batch-preview-wrapper">

                        <table className="batch-preview-table">

                          <thead>

                            <tr>

                              <th>
                                COMPANY
                              </th>

                              <th>
                                PHILHEALTH NO.
                              </th>

                              <th>
                                LAST NAME
                              </th>

                              <th>
                                FIRST NAME
                              </th>

                              <th>
                                AGE
                              </th>

                              <th>
                                CONTACT NUMBER
                              </th>

                              <th>
                                STATUS
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {batchRows
                              .slice(
                                0,
                                15
                              )
                              .map(
                                (
                                  patient,
                                  index
                                ) => (

                                  <tr
                                    key={
                                      index
                                    }
                                  >

                                    <td>
                                      {
                                        patient.company ||
                                        "-"
                                      }
                                    </td>

                                    <td>
                                      {
                                        patient.philhealthNo ||
                                        "-"
                                      }
                                    </td>

                                    <td>
                                      {
                                        patient.lastName ||
                                        "-"
                                      }
                                    </td>

                                    <td>
                                      {
                                        patient.firstName ||
                                        "-"
                                      }
                                    </td>

                                    <td>
                                      {
                                        patient.age ||
                                        "-"
                                      }
                                    </td>

                                    <td>
                                      {
                                        patient.contactNumber ||
                                        "-"
                                      }
                                    </td>

                                    <td>
                                      {
                                        patient.registrationStatus ||
                                        "-"
                                      }
                                    </td>

                                  </tr>

                                )
                              )}

                          </tbody>

                        </table>

                      </div>


                      {batchRows.length >
                        15 && (

                        <p className="batch-more-text">

                          Showing first 15 of{" "}
                          {
                            batchRows.length
                          }{" "}
                          new records.

                        </p>

                      )}

                    </div>

                  )}

                </div>

              )}


              <div className="batch-upload-policy">

                <span>
                  🔒
                </span>

                <div>

                  <strong>
                    Safe Import
                  </strong>

                  <p>
                    Existing patients will not be overwritten.
                    Records with an existing PhilHealth No.
                    will automatically be skipped as duplicates.
                  </p>

                </div>

              </div>

            </div>


            <div className="add-patient-footer">

              <button
                type="button"
                className="add-patient-cancel"
                onClick={
                  closeBatchUpload
                }
                disabled={
                  isImporting
                }
              >
                CANCEL
              </button>


              <button
                type="button"
                className="add-patient-save"
                onClick={
                  handleBatchImport
                }
                disabled={
                  isImporting ||
                  batchRows.length ===
                    0
                }
              >

                {isImporting
                  ? "IMPORTING..."
                  : `IMPORT ${batchRows.length} PATIENT${
                      batchRows.length ===
                      1
                        ? ""
                        : "S"
                    }`}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          BATCH HISTORY MODAL
      ====================================================== */}

      {showBatchHistory && (

        <div className="add-patient-modal">

          <div className="add-patient-modal-content">

            <div className="add-patient-header">

              <div>

                <h2>
                  BATCH HISTORY
                </h2>

                <p>
                  Manage previously uploaded employee files
                </p>

              </div>


              <button
                type="button"
                className="add-patient-close"
                onClick={() =>
                  setShowBatchHistory(
                    false
                  )
                }
                disabled={
                  isDeletingBatch
                }
              >
                ×
              </button>

            </div>


            <div className="add-patient-form">

              {batchHistory.length ===
              0 ? (

                <div className="icare-no-data">

                  <div className="icare-no-data-icon">
                    📂
                  </div>

                  <strong>
                    No batch uploads found
                  </strong>

                  <p>
                    Uploaded Excel batches will appear here.
                  </p>

                </div>

              ) : (

                <div className="batch-history-list">

                  {batchHistory.map(
                    (batch) => (

                      <div
                        key={
                          batch.id
                        }
                        className="batch-history-item"
                      >

                        <div className="batch-history-info">

                          <div className="batch-history-file">
                            📄
                          </div>

                          <div>

                            <strong>
                              {
                                batch.fileName ||
                                "Unknown File"
                              }
                            </strong>

                            <small>
                              {
                                batch.patientCount ||
                                0
                              }{" "}
                              patient(s)
                            </small>

                            <small>
                              Uploaded:{" "}
                              {
                                batch.uploadedAt
                                  ? new Date(
                                      batch.uploadedAt
                                    ).toLocaleString()
                                  : "-"
                              }
                            </small>

                          </div>

                        </div>


                        <button
                          type="button"
                          className="delete-patient-button"
                          onClick={() =>
                            handleDeleteBatch(
                              batch
                            )
                          }
                          disabled={
                            isDeletingBatch
                          }
                        >
                          🗑️ DELETE BATCH
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>


            <div className="add-patient-footer">

              <button
                type="button"
                className="add-patient-cancel"
                onClick={() =>
                  setShowBatchHistory(
                    false
                  )
                }
                disabled={
                  isDeletingBatch
                }
              >
                CLOSE
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          ADD COMPANY MODAL
      ====================================================== */}

      {showAddCompany && (

        <div className="add-patient-modal">

          <div className="add-patient-modal-content">

            <div className="add-patient-header">

              <div>

                <h2>
                  ADD COMPANY
                </h2>

                <p>
                  Add a new company to the list
                </p>

              </div>


              <button
                type="button"
                className="add-patient-close"
                onClick={() => {

                  setShowAddCompany(
                    false
                  );

                  setNewCompanyName(
                    ""
                  );

                }}
              >
                ×
              </button>

            </div>


            <div className="add-patient-form">

              <div className="add-patient-section">

                <div className="add-patient-section-header">

                  <span className="add-patient-section-number">
                    1
                  </span>

                  <div>

                    <h3>
                      Company Information
                    </h3>

                    <p>
                      Enter the company name
                    </p>

                  </div>

                </div>


                <div className="add-patient-grid">

                  <div className="add-patient-field">

                    <label>
                      COMPANY NAME
                    </label>

                    <input
                      type="text"
                      value={
                        newCompanyName
                      }
                      onChange={(e) =>
                        setNewCompanyName(
                          e.target.value
                        )
                      }
                      placeholder="Enter company name"
                      autoFocus
                    />

                  </div>

                </div>

              </div>

            </div>


            <div className="add-patient-footer">

              <button
                type="button"
                className="add-patient-cancel"
                onClick={() => {

                  setShowAddCompany(
                    false
                  );

                  setNewCompanyName(
                    ""
                  );

                }}
              >
                CANCEL
              </button>


              <button
                type="button"
                className="add-patient-save"
                onClick={
                  handleAddCompany
                }
              >
                ADD COMPANY
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          NOTIFICATION TOAST
      ====================================================== */}

      {notification && (

        <div
          className={`icare-toast ${notification.type}`}
          role="status"
          aria-live="polite"
        >

          <div className="icare-toast-icon">

            {notification.type ===
            "success"
              ? "✓"
              : "!"}

          </div>


          <div className="icare-toast-content">

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
            className="icare-toast-close"
            onClick={() =>
              setNotification(
                null
              )
            }
            aria-label="Close notification"
          >
            ×
          </button>


          <div className="icare-toast-progress" />

        </div>

      )}

    </div>
  );
}


export default IcareRegistration;