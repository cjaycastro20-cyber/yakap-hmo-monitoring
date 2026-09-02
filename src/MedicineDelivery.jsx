import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./MedicineDelivery.css";

/* =========================================================
   STORAGE
========================================================= */

const ICARE_STORAGE_KEY = "icarePatients";
const TELECONSULT_STORAGE_KEY = "teleconsultExtraData";

const DELIVERY_SYNC_EVENT =
  "medicineDeliveryDataChanged";

const TELECONSULT_SYNC_EVENT =
  "teleconsultDataChanged";

/* =========================================================
   HELPERS
========================================================= */

const cleanString = (value) =>
  String(value ?? "").trim();

const normalizeValue = (value) =>
  cleanString(value).toLowerCase();

const normalizeId = (value) =>
  cleanString(value).toLowerCase();

const getIcareValue = (record, key) => {
  if (!record) {
    return "";
  }

  if (
    record[key] !== undefined &&
    record[key] !== null
  ) {
    return record[key];
  }

  const alternateKey =
    key.charAt(0).toUpperCase() +
    key.slice(1);

  if (
    record[alternateKey] !== undefined &&
    record[alternateKey] !== null
  ) {
    return record[alternateKey];
  }

  return "";
};

/* =========================================================
   PATIENT ID
========================================================= */

const getPatientStableId = (patient) => {
  if (!patient) {
    return "";
  }

  const directId =
    patient.id ??
    patient.ID ??
    patient.patientId ??
    patient.patientID;

  if (
    directId !== undefined &&
    directId !== null &&
    cleanString(directId) !== ""
  ) {
    return cleanString(directId);
  }

  const philHealthNo =
    getIcareValue(
      patient,
      "philhealthNo"
    ) ||
    getIcareValue(
      patient,
      "philHealthNo"
    );

  const lastName =
    getIcareValue(
      patient,
      "lastName"
    );

  const firstName =
    getIcareValue(
      patient,
      "firstName"
    );

  const middleName =
    getIcareValue(
      patient,
      "middleName"
    );

  return [
    philHealthNo,
    lastName,
    firstName,
    middleName,
  ]
    .map((value) =>
      normalizeId(value)
    )
    .join("-");
};

/* =========================================================
   PATIENT IDENTIFIER CANDIDATES
========================================================= */

const getPatientIdentifierCandidates = (
  patient
) => {
  if (!patient) {
    return [];
  }

  const values = [
    patient.id,
    patient.ID,
    patient.patientId,
    patient.patientID,
    patient.philhealthNo,
    patient.philHealthNo,
    getIcareValue(
      patient,
      "philhealthNo"
    ),
    getIcareValue(
      patient,
      "philHealthNo"
    ),
    getPatientStableId(patient),
  ];

  return [
    ...new Set(
      values
        .filter(
          (value) =>
            value !== undefined &&
            value !== null &&
            cleanString(value) !== ""
        )
        .map((value) =>
          normalizeId(value)
        )
    ),
  ];
};

/* =========================================================
   TELECONSULT MATCHING
========================================================= */

const findTeleconsultExtra = (
  patient,
  teleconsultData
) => {
  if (
    !patient ||
    !teleconsultData ||
    typeof teleconsultData !== "object" ||
    Array.isArray(teleconsultData)
  ) {
    return null;
  }

  const possibleIds =
    getPatientIdentifierCandidates(
      patient
    );

  /* -------------------------------------------------------
     DIRECT KEY MATCH
  ------------------------------------------------------- */

  for (const key of Object.keys(
    teleconsultData
  )) {
    if (
      possibleIds.includes(
        normalizeId(key)
      )
    ) {
      return teleconsultData[key];
    }
  }

  /* -------------------------------------------------------
     FALLBACK RECORD MATCH
     Protects against slightly different IDs.
  ------------------------------------------------------- */

  const patientPhilHealth =
    normalizeId(
      getIcareValue(
        patient,
        "philhealthNo"
      ) ||
        getIcareValue(
          patient,
          "philHealthNo"
        )
    );

  const patientLastName =
    normalizeId(
      getIcareValue(
        patient,
        "lastName"
      )
    );

  const patientFirstName =
    normalizeId(
      getIcareValue(
        patient,
        "firstName"
      )
    );

  for (const extra of Object.values(
    teleconsultData
  )) {
    if (
      !extra ||
      typeof extra !== "object"
    ) {
      continue;
    }

    const extraPhilHealth =
      normalizeId(
        extra.philhealthNo ||
          extra.philHealthNo
      );

    const extraLastName =
      normalizeId(
        extra.lastName
      );

    const extraFirstName =
      normalizeId(
        extra.firstName
      );

    if (
      patientPhilHealth &&
      extraPhilHealth &&
      patientPhilHealth ===
        extraPhilHealth
    ) {
      return extra;
    }

    if (
      patientLastName &&
      patientFirstName &&
      extraLastName ===
        patientLastName &&
      extraFirstName ===
        patientFirstName
    ) {
      return extra;
    }
  }

  return null;
};

/* =========================================================
   FPE
========================================================= */

const isFpeQualified = (value) => {
  const normalized =
    normalizeValue(value);

  /*
   * If ICARE does not contain FPE,
   * do not block the patient.
   */
  if (!normalized) {
    return true;
  }

  return (
    normalized === "completed" ||
    normalized === "yes" ||
    normalized === "done"
  );
};

/* =========================================================
   MEDICINE DELIVERY ENDORSEMENT
========================================================= */

const getMedicineDeliveryEndorsementValues = (
  extra
) => {
  if (
    !extra ||
    typeof extra !== "object"
  ) {
    return [];
  }

  return [
    extra.medicineDelivery,
    extra.endorseToMedicineDelivery,
    extra.endorseMedicineDelivery,
    extra.medicineDeliveryEndorsement,
    extra.endorsedToMedicineDelivery,
    extra.medicineDeliveryStatus,
    extra.deliveryEndorsement,
    extra.endorsement,
    extra.medicineDeliveryEndorsed,
    extra.endorseToDelivery,
    extra.isMedicineDelivery,
    extra.isMedicineDeliveryEndorsed,
    extra.medicineDeliveryEndorsedStatus,
    extra.medicineDeliveryReferral,
    extra.medicineDeliveryReferralStatus,
  ];
};

const isMedicineDeliveryEndorsed = (
  extra
) => {
  if (
    !extra ||
    typeof extra !== "object"
  ) {
    return false;
  }

  /*
   * IMPORTANT:
   * medicineDelivery is the primary field
   * used by Teleconsult.
   */
  if (
    extra.medicineDelivery !==
    undefined
  ) {
    const primary =
      extra.medicineDelivery;

    if (
      primary === true ||
      primary === 1
    ) {
      return true;
    }

    return (
      normalizeValue(primary) ===
      "yes"
    );
  }

  /*
   * Support older / alternate fields.
   */
  const possibleValues =
    getMedicineDeliveryEndorsementValues(
      extra
    );

  return possibleValues.some(
    (value) => {
      if (
        value === true ||
        value === 1
      ) {
        return true;
      }

      const normalized =
        normalizeValue(value);

      if (!normalized) {
        return false;
      }

      if (
        normalized === "yes" ||
        normalized === "true" ||
        normalized === "1" ||
        normalized ===
          "endorsed" ||
        normalized ===
          "yes - endorsed" ||
        normalized ===
          "yes—endorsed" ||
        normalized ===
          "yes — endorsed" ||
        normalized ===
          "yes - endorse" ||
        normalized ===
          "endorsed to medicine delivery" ||
        normalized ===
          "medicine delivery" ||
        normalized ===
          "medicine delivery endorsed"
      ) {
        return true;
      }

      const hasYes =
        normalized.includes("yes");

      const hasEndorsed =
        normalized.includes("endors");

      const hasMedicine =
        normalized.includes(
          "medicine"
        );

      const hasDelivery =
        normalized.includes(
          "delivery"
        );

      return (
        (hasYes &&
          hasEndorsed) ||
        (hasEndorsed &&
          hasMedicine &&
          hasDelivery)
      );
    }
  );
};

const getMedicineDeliveryValue = (
  extra
) => {
  if (
    !extra ||
    typeof extra !== "object"
  ) {
    return "No";
  }

  const endorsed =
    isMedicineDeliveryEndorsed(
      extra
    );

  return endorsed
    ? "✓ Yes — Endorsed"
    : "No";
};

/* =========================================================
   DELIVERY ID
========================================================= */

const getMonthlyDeliveryId = (
  patientId,
  delivery,
  index
) => {
  if (
    delivery?.id !== undefined &&
    delivery?.id !== null &&
    cleanString(delivery.id) !== ""
  ) {
    return String(delivery.id);
  }

  return [
    patientId,
    "monthly",
    delivery?.month || "",
    delivery?.scheduledDate ||
      delivery?.date ||
      "",
    index,
  ]
    .join("::")
    .replace(/\s+/g, "-")
    .toLowerCase();
};

/* =========================================================
   MEDICINE
========================================================= */

const getMedicineName = (
  medicine
) => {
  if (!medicine) {
    return "";
  }

  return (
    medicine.medicine ||
    medicine.name ||
    medicine.medicineName ||
    medicine.drugName ||
    medicine.productName ||
    ""
  );
};

const getMedicineId = (
  patientId,
  medicine,
  index
) => {
  if (
    medicine?.id !== undefined &&
    medicine?.id !== null &&
    cleanString(medicine.id) !== ""
  ) {
    return String(medicine.id);
  }

  return [
    patientId,
    "medicine",
    getMedicineName(medicine),
    index,
  ]
    .join("::")
    .replace(/\s+/g, "-")
    .toLowerCase();
};

/* =========================================================
   MONTHLY DELIVERY SOURCE
========================================================= */

const getMonthlyDeliverySource = (
  extra
) => {
  if (!extra) {
    return {
      field:
        "monthlyDeliveries",
      deliveries: [],
    };
  }

  if (
    Array.isArray(
      extra.monthlyDeliveries
    )
  ) {
    return {
      field:
        "monthlyDeliveries",
      deliveries:
        extra.monthlyDeliveries,
    };
  }

  if (
    Array.isArray(
      extra.subsequentDeliveries
    )
  ) {
    return {
      field:
        "subsequentDeliveries",
      deliveries:
        extra.subsequentDeliveries,
    };
  }

  if (
    Array.isArray(
      extra.deliveries
    )
  ) {
    return {
      field: "deliveries",
      deliveries:
        extra.deliveries,
    };
  }

  return {
    field:
      "monthlyDeliveries",
    deliveries: [],
  };
};

/* =========================================================
   DATE
========================================================= */

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const stringValue =
    cleanString(value);

  const date = new Date(
    `${stringValue}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return stringValue;
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }
  );
};

/* =========================================================
   CONTACT
========================================================= */

const formatContactNumber = (
  value
) => {
  if (!value) {
    return "—";
  }

  const raw =
    cleanString(value);

  if (
    raw.startsWith("+63")
  ) {
    return raw;
  }

  if (
    raw.startsWith("63")
  ) {
    return `+${raw}`;
  }

  if (
    raw.startsWith("0")
  ) {
    return `+63 ${raw.slice(1)}`;
  }

  return `+63 ${raw}`;
};

/* =========================================================
   NEXT DELIVERY
========================================================= */

const getNextDelivery = (
  patient
) => {
  const deliveries =
    Array.isArray(
      patient?.monthlyDeliveries
    )
      ? patient.monthlyDeliveries
      : [];

  const activeDeliveries =
    deliveries.filter(
      (delivery) => {
        const status =
          normalizeValue(
            delivery.status
          );

        return (
          status !== "delivered" &&
          status !== "cancelled"
        );
      }
    );

  if (
    !activeDeliveries.length
  ) {
    return null;
  }

  const withDates =
    activeDeliveries
      .filter(
        (delivery) =>
          delivery.scheduledDate
      )
      .sort(
        (a, b) =>
          new Date(
            a.scheduledDate
          ) -
          new Date(
            b.scheduledDate
          )
      );

  return (
    withDates[0] ||
    activeDeliveries[0] ||
    null
  );
};

/* =========================================================
   COMPONENT
========================================================= */

function MedicineDelivery() {
  const [
    icarePatients,
    setIcarePatients,
  ] = useState([]);

  const [
    teleconsultExtraData,
    setTeleconsultExtraData,
  ] = useState({});

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("All");

  const [
    viewingPatientId,
    setViewingPatientId,
  ] = useState(null);

  const [
    modalMode,
    setModalMode,
  ] = useState("view");

  const [
    editingDeliveries,
    setEditingDeliveries,
  ] = useState([]);

  const [
    editingAddress,
    setEditingAddress,
  ] = useState("");

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  /* =======================================================
     LOAD ICARE
  ======================================================= */

  const loadIcarePatients =
    useCallback(() => {
      try {
        const saved =
          localStorage.getItem(
            ICARE_STORAGE_KEY
          );

        if (!saved) {
          setIcarePatients([]);
          return;
        }

        const parsed =
          JSON.parse(saved);

        if (
          !Array.isArray(parsed)
        ) {
          setIcarePatients([]);
          return;
        }

        setIcarePatients(parsed);
      } catch (error) {
        console.error(
          "MedicineDelivery ICARE error:",
          error
        );

        setIcarePatients([]);
      }
    }, []);

  /* =======================================================
     LOAD TELECONSULT
  ======================================================= */

  const loadTeleconsultData =
    useCallback(() => {
      try {
        const saved =
          localStorage.getItem(
            TELECONSULT_STORAGE_KEY
          );

        if (!saved) {
          setTeleconsultExtraData(
            {}
          );
          return;
        }

        const parsed =
          JSON.parse(saved);

        if (
          parsed &&
          typeof parsed ===
            "object" &&
          !Array.isArray(parsed)
        ) {
          setTeleconsultExtraData(
            parsed
          );
        } else {
          setTeleconsultExtraData(
            {}
          );
        }
      } catch (error) {
        console.error(
          "MedicineDelivery Teleconsult error:",
          error
        );

        setTeleconsultExtraData(
          {}
        );
      }
    }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadIcarePatients();
    loadTeleconsultData();
  }, [
    loadIcarePatients,
    loadTeleconsultData,
  ]);

  /* =======================================================
     SAME-TAB SYNC
  ======================================================= */

  useEffect(() => {
    const handleSync = () => {
      loadIcarePatients();
      loadTeleconsultData();
    };

    window.addEventListener(
      DELIVERY_SYNC_EVENT,
      handleSync
    );

    window.addEventListener(
      TELECONSULT_SYNC_EVENT,
      handleSync
    );

    return () => {
      window.removeEventListener(
        DELIVERY_SYNC_EVENT,
        handleSync
      );

      window.removeEventListener(
        TELECONSULT_SYNC_EVENT,
        handleSync
      );
    };
  }, [
    loadIcarePatients,
    loadTeleconsultData,
  ]);

  /* =======================================================
     CROSS TAB SYNC
  ======================================================= */

  useEffect(() => {
    const handleStorage = (
      event
    ) => {
      if (
        event.key ===
          ICARE_STORAGE_KEY ||
        event.key ===
          TELECONSULT_STORAGE_KEY ||
        event.key === null
      ) {
        loadIcarePatients();
        loadTeleconsultData();
      }
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    loadIcarePatients,
    loadTeleconsultData,
  ]);

  /* =======================================================
     BACKUP REFRESH
  ======================================================= */

  useEffect(() => {
    const interval =
      setInterval(() => {
        loadIcarePatients();
        loadTeleconsultData();
      }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [
    loadIcarePatients,
    loadTeleconsultData,
  ]);

  /* =======================================================
     BUILD DELIVERY PATIENTS
  ======================================================= */

  const deliveryPatients =
    useMemo(() => {
      const result = [];
      const usedIds = new Set();

      icarePatients.forEach(
        (icarePatient) => {
          const stableId =
            getPatientStableId(
              icarePatient
            );

          if (!stableId) {
            return;
          }

          const normalizedStableId =
            normalizeId(
              stableId
            );

          if (
            usedIds.has(
              normalizedStableId
            )
          ) {
            return;
          }

          const matchedExtra =
            findTeleconsultExtra(
              icarePatient,
              teleconsultExtraData
            );

          /*
           * Patient must have a Teleconsult record.
           */
          if (!matchedExtra) {
            return;
          }

          /*
           * FPE check.
           */
          const fpe =
            getIcareValue(
              icarePatient,
              "fpe"
            );

          if (
            !isFpeQualified(fpe)
          ) {
            return;
          }

          /*
           * MAIN RULE:
           *
           * Only patients with
           * medicineDelivery = Yes
           * appear here.
           */
          if (
            !isMedicineDeliveryEndorsed(
              matchedExtra
            )
          ) {
            return;
          }

          usedIds.add(
            normalizedStableId
          );

          /* -------------------------------------------------
             MONTHLY DELIVERIES
          ------------------------------------------------- */

          const rawMonthly =
            getMonthlyDeliverySource(
              matchedExtra
            ).deliveries;

          const monthlyDeliveries =
            rawMonthly.map(
              (
                delivery,
                index
              ) => ({
                ...delivery,

                id:
                  getMonthlyDeliveryId(
                    stableId,
                    delivery,
                    index
                  ),

                month:
                  delivery?.month ||
                  `Monthly Delivery ${
                    index + 1
                  }`,

                scheduledDate:
                  delivery?.scheduledDate ||
                  delivery?.date ||
                  "",

                status:
                  delivery?.status ||
                  "Pending",

                actualDate:
                  delivery?.actualDate ||
                  delivery?.deliveredDate ||
                  delivery?.actualDeliveryDate ||
                  delivery?.dateDelivered ||
                  "",
              })
            );

          /* -------------------------------------------------
             MEDICINES
          ------------------------------------------------- */

          let rawMedicines = [];

          if (
            Array.isArray(
              matchedExtra.medicines
            )
          ) {
            rawMedicines =
              matchedExtra.medicines;
          } else if (
            matchedExtra.medicinesByMonth &&
            typeof
              matchedExtra.medicinesByMonth ===
                "object"
          ) {
            rawMedicines =
              Object.values(
                matchedExtra.medicinesByMonth
              ).flatMap(
                (items) =>
                  Array.isArray(items)
                    ? items
                    : []
              );
          }

          const medicines =
            rawMedicines.map(
              (
                medicine,
                index
              ) => ({
                ...medicine,

                id:
                  getMedicineId(
                    stableId,
                    medicine,
                    index
                  ),

                medicine:
                  getMedicineName(
                    medicine
                  ),

                quantity:
                  Number(
                    medicine?.quantity ??
                      medicine?.qty ??
                      0
                  ),
              })
            );

          /* -------------------------------------------------
             ADDRESS
          ------------------------------------------------- */

          const deliveryAddress =
            matchedExtra.deliveryAddress ||
            matchedExtra.address ||
            matchedExtra.patientAddress ||
            getIcareValue(
              icarePatient,
              "address"
            );

          /* -------------------------------------------------
             PATIENT
          ------------------------------------------------- */

          const patient = {
            id: stableId,

            company:
              matchedExtra.company ||
              getIcareValue(
                icarePatient,
                "company"
              ),

            no:
              getIcareValue(
                icarePatient,
                "no"
              ),

            philHealthNo:
              getIcareValue(
                icarePatient,
                "philhealthNo"
              ) ||
              getIcareValue(
                icarePatient,
                "philHealthNo"
              ),

            lastName:
              getIcareValue(
                icarePatient,
                "lastName"
              ),

            firstName:
              getIcareValue(
                icarePatient,
                "firstName"
              ),

            middleName:
              getIcareValue(
                icarePatient,
                "middleName"
              ),

            dateOfBirth:
              getIcareValue(
                icarePatient,
                "dateOfBirth"
              ),

            address:
              deliveryAddress,

            age:
              getIcareValue(
                icarePatient,
                "age"
              ),

            contactNo:
              matchedExtra.contactNo ||
              getIcareValue(
                icarePatient,
                "contactNo"
              ),

            dateOfCall:
              matchedExtra.dateOfCall ||
              "",

            nextTeleconsult:
              matchedExtra.nextTeleconsult ||
              "",

            teleconsultStatus:
              matchedExtra.status ||
              "Call Done",

            remarks:
              matchedExtra.remarks ||
              "",

            medicineDelivery:
              getMedicineDeliveryValue(
                matchedExtra
              ),

            medicines,

            monthlyDeliveries,
          };

          patient.nextDelivery =
            getNextDelivery(
              patient
            );

          result.push(patient);
        }
      );

      return result;
    }, [
      icarePatients,
      teleconsultExtraData,
    ]);

  /* =======================================================
     VIEWING PATIENT
  ======================================================= */

  const viewingPatient =
    useMemo(() => {
      if (!viewingPatientId) {
        return null;
      }

      return (
        deliveryPatients.find(
          (patient) =>
            patient.id ===
            viewingPatientId
        ) || null
      );
    }, [
      deliveryPatients,
      viewingPatientId,
    ]);

  /* =======================================================
     OVERALL STATUS
  ======================================================= */

  const getOverallStatus =
    useCallback(
      (patient) => {
        if (!patient) {
          return "Pending";
        }

        const deliveries =
          Array.isArray(
            patient.monthlyDeliveries
          )
            ? patient.monthlyDeliveries
            : [];

        if (!deliveries.length) {
          return "Pending";
        }

        const normalizedStatuses =
          deliveries.map(
            (delivery) =>
              normalizeValue(
                delivery.status
              )
          );

        const allDelivered =
          normalizedStatuses.every(
            (status) =>
              status === "delivered"
          );

        if (allDelivered) {
          return "Completed";
        }

        const allCancelled =
          normalizedStatuses.every(
            (status) =>
              status === "cancelled"
          );

        if (allCancelled) {
          return "Cancelled";
        }

        if (
          normalizedStatuses.includes(
            "out for delivery"
          )
        ) {
          return "Out for Delivery";
        }

        if (
          normalizedStatuses.includes(
            "preparing"
          )
        ) {
          return "Preparing";
        }

        return "Pending";
      },
      []
    );

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredPatients =
    useMemo(() => {
      const search =
        searchTerm
          .toLowerCase()
          .trim();

      return deliveryPatients.filter(
        (patient) => {
          const fullName = [
            patient.lastName,
            patient.firstName,
            patient.middleName,
          ]
            .filter(Boolean)
            .join(" ");

          const medicineNames =
            patient.medicines
              ?.map(
                (medicine) =>
                  medicine.medicine
              )
              .join(" ") || "";

          const matchesSearch =
            !search ||
            [
              fullName,
              patient.philHealthNo,
              patient.address,
              medicineNames,
            ].some(
              (value) =>
                String(
                  value || ""
                )
                  .toLowerCase()
                  .includes(search)
            );

          const overallStatus =
            getOverallStatus(
              patient
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            overallStatus ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      deliveryPatients,
      searchTerm,
      statusFilter,
      getOverallStatus,
    ]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const counts = {
      totalEndorsed:
        deliveryPatients.length,

      totalPending: 0,
      totalPreparing: 0,
      totalOutForDelivery: 0,
      totalCompleted: 0,
      totalCancelled: 0,
    };

    deliveryPatients.forEach(
      (patient) => {
        const status =
          getOverallStatus(
            patient
          );

        switch (status) {
          case "Pending":
            counts.totalPending += 1;
            break;

          case "Preparing":
            counts.totalPreparing += 1;
            break;

          case "Out for Delivery":
            counts.totalOutForDelivery += 1;
            break;

          case "Completed":
            counts.totalCompleted += 1;
            break;

          case "Cancelled":
            counts.totalCancelled += 1;
            break;

          default:
            break;
        }
      }
    );

    return counts;
  }, [
    deliveryPatients,
    getOverallStatus,
  ]);

  /* =======================================================
     OPEN VIEW
  ======================================================= */

  const handleViewPatient =
    useCallback(
      (patient) => {
        if (!patient) {
          return;
        }

        setModalMode("view");

        setEditingAddress(
          patient.address || ""
        );

        setEditingDeliveries(
          Array.isArray(
            patient.monthlyDeliveries
          )
            ? patient.monthlyDeliveries.map(
                (delivery) => ({
                  ...delivery,
                })
              )
            : []
        );

        setViewingPatientId(
          patient.id
        );
      },
      []
    );

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  const handleEditPatient =
    useCallback(
      (patient) => {
        if (!patient) {
          return;
        }

        setModalMode("edit");

        setEditingAddress(
          patient.address || ""
        );

        setEditingDeliveries(
          Array.isArray(
            patient.monthlyDeliveries
          )
            ? patient.monthlyDeliveries.map(
                (delivery) => ({
                  ...delivery,
                })
              )
            : []
        );

        setViewingPatientId(
          patient.id
        );
      },
      []
    );

  /* =======================================================
     CHANGE LOCAL DELIVERY
  ======================================================= */

  const handleLocalDeliveryChange =
    useCallback(
      (
        deliveryId,
        field,
        value
      ) => {
        if (
          modalMode !== "edit"
        ) {
          return;
        }

        setEditingDeliveries(
          (previous) =>
            previous.map(
              (delivery) => {
                if (
                  String(
                    delivery.id
                  ) !==
                  String(
                    deliveryId
                  )
                ) {
                  return delivery;
                }

                const updated = {
                  ...delivery,
                  [field]: value,
                };

                if (
                  field === "status" &&
                  value ===
                    "Delivered" &&
                  !delivery.actualDate
                ) {
                  updated.actualDate =
                    new Date()
                      .toISOString()
                      .split("T")[0];
                }

                return updated;
              }
            )
        );
      },
      [modalMode]
    );

  /* =======================================================
     SAVE CHANGES
  ======================================================= */

  const handleSaveChanges =
    useCallback(async () => {
      if (
        !viewingPatient ||
        modalMode !== "edit"
      ) {
        return;
      }

      setIsSaving(true);

      try {
        const saved =
          localStorage.getItem(
            TELECONSULT_STORAGE_KEY
          );

        let existingData = {};

        if (saved) {
          try {
            const parsed =
              JSON.parse(saved);

            if (
              parsed &&
              typeof parsed ===
                "object" &&
              !Array.isArray(parsed)
            ) {
              existingData = parsed;
            }
          } catch (error) {
            console.error(
              "Error parsing teleconsult data:",
              error
            );
          }
        }

        const updatedData = {
          ...existingData,
        };

        const current = {
          ...(updatedData[
            viewingPatient.id
          ] || {}),
        };

        const {
          field: deliveryField,
          deliveries:
            originalDeliveries,
        } =
          getMonthlyDeliverySource(
            current
          );

        const updatedDeliveries =
          originalDeliveries.map(
            (
              originalDelivery,
              index
            ) => {
              const originalId =
                getMonthlyDeliveryId(
                  viewingPatient.id,
                  originalDelivery,
                  index
                );

              const editedDelivery =
                editingDeliveries.find(
                  (delivery) =>
                    String(
                      delivery.id
                    ) ===
                    String(
                      originalId
                    )
                );

              if (!editedDelivery) {
                return originalDelivery;
              }

              return {
                ...originalDelivery,
                ...editedDelivery,

                id:
                  originalDelivery.id ||
                  editedDelivery.id ||
                  originalId,
              };
            }
          );

        editingDeliveries.forEach(
          (editedDelivery) => {
            const exists =
              updatedDeliveries.some(
                (delivery) =>
                  String(
                    delivery.id ||
                      getMonthlyDeliveryId(
                        viewingPatient.id,
                        delivery,
                        updatedDeliveries.indexOf(
                          delivery
                        )
                      )
                  ) ===
                  String(
                    editedDelivery.id
                  )
              );

            if (!exists) {
              updatedDeliveries.push({
                ...editedDelivery,
              });
            }
          }
        );

        current[
          deliveryField
        ] = updatedDeliveries;

        current.address =
          editingAddress;

        current.deliveryAddress =
          editingAddress;

        /*
         * IMPORTANT:
         * Preserve the endorsement.
         *
         * MedicineDelivery itself should
         * never accidentally change
         * medicineDelivery from Yes to No.
         */
        if (
          current.medicineDelivery ===
          undefined
        ) {
          current.medicineDelivery =
            "Yes";
        }

        updatedData[
          viewingPatient.id
        ] = current;

        localStorage.setItem(
          TELECONSULT_STORAGE_KEY,
          JSON.stringify(
            updatedData
          )
        );

        setTeleconsultExtraData(
          updatedData
        );

        /*
         * Notify both components.
         */
        window.dispatchEvent(
          new Event(
            DELIVERY_SYNC_EVENT
          )
        );

        window.dispatchEvent(
          new Event(
            TELECONSULT_SYNC_EVENT
          )
        );

        setModalMode("view");

        setEditingDeliveries(
          updatedDeliveries.map(
            (delivery) => ({
              ...delivery,
            })
          )
        );

        setEditingAddress(
          editingAddress
        );
      } catch (error) {
        console.error(
          "MedicineDelivery save changes error:",
          error
        );

        alert(
          "Unable to save changes. Please try again."
        );
      } finally {
        setIsSaving(false);
      }
    }, [
      viewingPatient,
      modalMode,
      editingDeliveries,
      editingAddress,
    ]);

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal =
    useCallback(() => {
      setViewingPatientId(null);
      setModalMode("view");
      setEditingDeliveries([]);
      setEditingAddress("");
    }, []);

  /* =======================================================
     CLOSE IF PATIENT DISAPPEARS
  ======================================================= */

  useEffect(() => {
    if (
      viewingPatientId &&
      !deliveryPatients.some(
        (patient) =>
          patient.id ===
          viewingPatientId
      )
    ) {
      closeModal();
    }
  }, [
    deliveryPatients,
    viewingPatientId,
    closeModal,
  ]);

  /* =======================================================
     DISPLAY NAME
  ======================================================= */

  const viewingPatientName =
    viewingPatient
      ? [
          viewingPatient.lastName,
          viewingPatient.firstName,
          viewingPatient.middleName,
        ]
          .filter(Boolean)
          .join(", ")
      : "—";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="medicine-delivery-page">

      {/* HEADER */}

      <div className="medicine-delivery-header">
        <div>
          <h1>
            Medicine Delivery
          </h1>

          <p>
            Monitor and manage medicine
            deliveries endorsed from
            Teleconsult.
          </p>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="medicine-delivery-summary-grid">

        <div className="medicine-delivery-summary-card">
          <div className="summary-icon">
            👥
          </div>

          <div>
            <span>
              Total Endorsed
            </span>

            <strong>
              {summary.totalEndorsed}
            </strong>
          </div>
        </div>

        <div className="medicine-delivery-summary-card">
          <div className="summary-icon pending-icon">
            🕐
          </div>

          <div>
            <span>
              Pending
            </span>

            <strong>
              {summary.totalPending}
            </strong>
          </div>
        </div>

        <div className="medicine-delivery-summary-card">
          <div className="summary-icon preparing-icon">
            📦
          </div>

          <div>
            <span>
              Preparing
            </span>

            <strong>
              {summary.totalPreparing}
            </strong>
          </div>
        </div>

        <div className="medicine-delivery-summary-card">
          <div className="summary-icon delivery-icon">
            🚚
          </div>

          <div>
            <span>
              Out for Delivery
            </span>

            <strong>
              {
                summary.totalOutForDelivery
              }
            </strong>
          </div>
        </div>

        <div className="medicine-delivery-summary-card">
          <div className="summary-icon completed-icon">
            ✓
          </div>

          <div>
            <span>
              Completed
            </span>

            <strong>
              {summary.totalCompleted}
            </strong>
          </div>
        </div>

      </div>

      {/* TABLE */}

      <div className="medicine-delivery-table-card">

        <div className="medicine-delivery-table-header">

          <div>
            <h2>
              Medicine Delivery Records
            </h2>

            <p>
              Patients currently endorsed
              for medicine delivery.
            </p>
          </div>

          <div className="medicine-delivery-controls">

            <div className="medicine-delivery-search">

              <span>
                🔍
              </span>

              <input
                type="text"
                placeholder="Search patient, address or medicine..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />

            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All Status
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Preparing">
                Preparing
              </option>

              <option value="Out for Delivery">
                Out for Delivery
              </option>

              <option value="Cancelled">
                Cancelled
              </option>

              <option value="Completed">
                Completed
              </option>
            </select>

          </div>

        </div>

        <div className="medicine-delivery-table-wrapper">

          <table className="medicine-delivery-table">

            <thead>
              <tr>
                <th>
                  Patient
                </th>

                <th>
                  PhilHealth No.
                </th>

                <th>
                  Address
                </th>

                <th>
                  Medicines
                </th>

                <th>
                  Next Delivery
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>

              {filteredPatients.length >
              0 ? (
                filteredPatients.map(
                  (patient) => {
                    const fullName = [
                      patient.lastName,
                      patient.firstName,
                      patient.middleName,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    const nextDelivery =
                      getNextDelivery(
                        patient
                      );

                    return (
                      <tr
                        key={
                          patient.id
                        }
                      >

                        <td>
                          <div className="delivery-patient-name">

                            <strong>
                              {fullName ||
                                "—"}
                            </strong>

                            {patient.age && (
                              <small>
                                Age:{" "}
                                {
                                  patient.age
                                }
                              </small>
                            )}

                          </div>
                        </td>

                        <td>
                          <span className="philhealth-number">
                            {patient.philHealthNo ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          <div className="delivery-address-cell">
                            <strong>
                              {patient.address ||
                                "—"}
                            </strong>
                          </div>
                        </td>

                        <td>

                          {patient.medicines
                            ?.length >
                          0 ? (

                            <div className="medicine-table-cell">

                              <div className="medicine-table-main">

                                <span className="medicine-small-icon">
                                  💊
                                </span>

                                <strong>
                                  {
                                    patient
                                      .medicines[0]
                                      .medicine ||
                                    "—"
                                  }
                                </strong>

                              </div>

                              {patient
                                .medicines
                                .length >
                                1 && (
                                <span className="delivery-count-badge">
                                  +
                                  {patient
                                    .medicines
                                    .length -
                                    1}{" "}
                                  more
                                </span>
                              )}

                              <small>
                                {patient
                                  .medicines[0]
                                  .quantity
                                  ? `Qty: ${patient.medicines[0].quantity}`
                                  : "Quantity not specified"}
                              </small>

                            </div>

                          ) : (
                            <span className="delivery-no-medicine">
                              No medicine
                            </span>
                          )}

                        </td>

                        <td>

                          {nextDelivery ? (
                            <div className="first-delivery-cell">

                              <span>
                                {formatDate(
                                  nextDelivery.scheduledDate
                                )}
                              </span>

                              <small>
                                {
                                  nextDelivery.month
                                }
                              </small>

                            </div>
                          ) : (
                            <div className="first-delivery-cell">

                              <span>
                                —
                              </span>

                              <small>
                                No schedule
                              </small>

                            </div>
                          )}

                        </td>

                        <td>

                          <div
                            style={{
                              display:
                                "flex",
                              gap:
                                "8px",
                              alignItems:
                                "center",
                              flexWrap:
                                "wrap",
                            }}
                          >

                            <button
                              type="button"
                              className="delivery-view-btn"
                              onClick={() =>
                                handleViewPatient(
                                  patient
                                )
                              }
                            >
                              👁 View
                            </button>

                            <button
                              type="button"
                              className="delivery-view-btn"
                              onClick={() =>
                                handleEditPatient(
                                  patient
                                )
                              }
                            >
                              ✎ Edit
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="delivery-empty"
                  >
                    <div>
                      📦
                    </div>

                    <strong>
                      No Medicine Delivery
                      Records
                    </strong>

                    <p>
                      Patients will appear
                      here when they are
                      endorsed to Medicine
                      Delivery from
                      Teleconsult.
                    </p>
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* VIEW / EDIT MODAL */}

      {viewingPatient && (
        <div
          className="medicine-delivery-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="medicine-delivery-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="medicine-delivery-modal-header">

              <div>

                <h2>
                  {modalMode === "edit"
                    ? "Edit Medicine Delivery"
                    : "Medicine Delivery Details"}
                </h2>

                <p>
                  {modalMode === "edit"
                    ? "Update delivery status and information."
                    : "View patient and medicine delivery information."}
                </p>

              </div>

              <button
                type="button"
                className="delivery-close-btn"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <div className="medicine-delivery-modal-body">

              {/* PATIENT INFORMATION */}

              <section className="delivery-section">

                <div className="delivery-section-title">

                  <span>
                    01
                  </span>

                  <div>
                    <h3>
                      Patient Information
                    </h3>

                    <p>
                      Patient details and
                      delivery address
                    </p>
                  </div>

                </div>

                <div className="delivery-detail-grid">

                  <div>
                    <label>
                      Patient
                    </label>

                    <strong>
                      {viewingPatientName}
                    </strong>
                  </div>

                  <div>
                    <label>
                      PhilHealth No.
                    </label>

                    <strong>
                      {viewingPatient.philHealthNo ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <label>
                      Age
                    </label>

                    <strong>
                      {viewingPatient.age ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <label>
                      Contact No.
                    </label>

                    <strong>
                      {formatContactNumber(
                        viewingPatient.contactNo
                      )}
                    </strong>
                  </div>

                  <div>
                    <label>
                      Company
                    </label>

                    <strong>
                      {viewingPatient.company ||
                        "—"}
                    </strong>
                  </div>

                  <div className="full">

                    <label>
                      DELIVERY ADDRESS
                    </label>

                    {modalMode ===
                    "edit" ? (
                      <input
                        type="text"
                        value={
                          editingAddress
                        }
                        placeholder="Enter delivery address"
                        onChange={(event) =>
                          setEditingAddress(
                            event.target.value
                          )
                        }
                      />
                    ) : (
                      <strong>
                        {viewingPatient.address ||
                          "—"}
                      </strong>
                    )}

                  </div>

                </div>

              </section>

              {/* TELECONSULT */}

              <section className="delivery-section">

                <div className="delivery-section-title">

                  <span>
                    02
                  </span>

                  <div>
                    <h3>
                      Teleconsult Information
                    </h3>

                    <p>
                      Endorsement details
                    </p>
                  </div>

                  <div className="delivery-pill">
                    ✓ Endorsed
                  </div>

                </div>

                <div className="delivery-detail-grid">

                  <div>
                    <label>
                      Date of Call
                    </label>

                    <strong>
                      {formatDate(
                        viewingPatient.dateOfCall
                      )}
                    </strong>
                  </div>

                  <div>
                    <label>
                      Next Teleconsult
                    </label>

                    <strong>
                      {formatDate(
                        viewingPatient.nextTeleconsult
                      )}
                    </strong>
                  </div>

                  <div>
                    <label>
                      Teleconsult Status
                    </label>

                    <strong>
                      {viewingPatient.teleconsultStatus ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <label>
                      Medicine Delivery
                    </label>

                    <strong>
                      {viewingPatient.medicineDelivery ||
                        "No"}
                    </strong>
                  </div>

                  <div className="full">

                    <label>
                      Remarks
                    </label>

                    <strong>
                      {viewingPatient.remarks ||
                        "—"}
                    </strong>

                  </div>

                </div>

              </section>

              {/* MEDICINES */}

              <section className="delivery-section">

                <div className="delivery-section-title">

                  <span>
                    03
                  </span>

                  <div>
                    <h3>
                      Prescribed Medicines
                    </h3>

                    <p>
                      Medicines endorsed for
                      delivery
                    </p>
                  </div>

                  <div className="delivery-pill">
                    💊{" "}
                    {
                      viewingPatient
                        .medicines
                        ?.length ||
                      0
                    }
                  </div>

                </div>

                {viewingPatient
                  .medicines
                  ?.length >
                0 ? (
                  <div className="delivery-medicine-list">

                    {viewingPatient.medicines.map(
                      (
                        medicine,
                        index
                      ) => (
                        <div
                          className="delivery-medicine-card"
                          key={
                            medicine.id ||
                            index
                          }
                        >

                          <div className="medicine-number">
                            {index + 1}
                          </div>

                          <div className="medicine-icon">
                            💊
                          </div>

                          <div className="medicine-info">

                            <strong>
                              {
                                medicine.medicine
                              }
                            </strong>

                            <span>
                              Quantity:{" "}
                              {
                                medicine.quantity
                              }
                            </span>

                          </div>

                        </div>
                      )
                    )}

                  </div>
                ) : (
                  <div className="delivery-no-data">
                    No medicines
                    prescribed.
                  </div>
                )}

              </section>

              {/* MONTHLY DELIVERIES */}

              <section className="delivery-section">

                <div className="delivery-section-title">

                  <span>
                    04
                  </span>

                  <div>

                    <h3>
                      Monthly Deliveries
                    </h3>

                    <p>
                      {modalMode ===
                      "edit"
                        ? "Edit each scheduled medicine delivery."
                        : "Scheduled medicine deliveries."}
                    </p>

                  </div>

                  <div className="delivery-pill">
                    📦{" "}
                    {
                      editingDeliveries.length
                    }
                  </div>

                </div>

                {editingDeliveries.length >
                0 ? (
                  <div className="monthly-delivery-list">

                    {editingDeliveries.map(
                      (
                        delivery,
                        index
                      ) => {

                        const normalizedStatus =
                          normalizeValue(
                            delivery.status ||
                              "Pending"
                          );

                        return (
                          <div
                            className="monthly-delivery-card"
                            key={
                              delivery.id ||
                              index
                            }
                          >

                            <div className="monthly-number">
                              {index + 1}
                            </div>

                            <div className="monthly-content">

                              <div className="monthly-header">

                                <div>

                                  <strong>
                                    {
                                      delivery.month ||
                                      `Month ${
                                        index +
                                        1
                                      }`
                                    }
                                  </strong>

                                  <span>
                                    Scheduled:{" "}
                                    {formatDate(
                                      delivery.scheduledDate
                                    )}
                                  </span>

                                </div>

                                <span
                                  className={`delivery-status ${normalizedStatus.replace(
                                    /\s+/g,
                                    "-"
                                  )}`}
                                >

                                  {normalizedStatus ===
                                    "pending" &&
                                    "🕐 "}

                                  {normalizedStatus ===
                                    "preparing" &&
                                    "📦 "}

                                  {normalizedStatus ===
                                    "out for delivery" &&
                                    "🚚 "}

                                  {normalizedStatus ===
                                    "delivered" &&
                                    "✓ "}

                                  {normalizedStatus ===
                                    "cancelled" &&
                                    "✕ "}

                                  {
                                    delivery.status ||
                                    "Pending"
                                  }

                                </span>

                              </div>

                              <div className="monthly-fields">

                                <div>

                                  <label>
                                    DELIVERY STATUS
                                  </label>

                                  {modalMode ===
                                  "edit" ? (
                                    <select
                                      value={
                                        delivery.status ||
                                        "Pending"
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        handleLocalDeliveryChange(
                                          delivery.id,
                                          "status",
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                    >

                                      <option value="Pending">
                                        🕐 Pending
                                      </option>

                                      <option value="Preparing">
                                        📦 Preparing
                                      </option>

                                      <option value="Out for Delivery">
                                        🚚 Out for Delivery
                                      </option>

                                      <option value="Delivered">
                                        ✓ Delivered
                                      </option>

                                      <option value="Cancelled">
                                        ✕ Cancelled
                                      </option>

                                    </select>
                                  ) : (
                                    <strong>
                                      {delivery.status ||
                                        "Pending"}
                                    </strong>
                                  )}

                                </div>

                                <div>

                                  <label>
                                    ACTUAL DELIVERY DATE
                                  </label>

                                  {modalMode ===
                                  "edit" ? (
                                    <input
                                      type="date"
                                      value={
                                        delivery.actualDate ||
                                        ""
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        handleLocalDeliveryChange(
                                          delivery.id,
                                          "actualDate",
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                    />
                                  ) : (
                                    <strong>
                                      {formatDate(
                                        delivery.actualDate
                                      )}
                                    </strong>
                                  )}

                                </div>

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>
                ) : (
                  <div className="delivery-no-data">

                    <div>
                      📦
                    </div>

                    <strong>
                      No monthly delivery
                      schedule
                    </strong>

                    <p>
                      Monthly deliveries
                      will appear here once
                      the schedule is
                      created in
                      Teleconsult.
                    </p>

                  </div>
                )}

              </section>

            </div>

            {/* FOOTER */}

            <div className="medicine-delivery-modal-footer">

              {modalMode ===
              "edit" ? (
                <>
                  <button
                    type="button"
                    className="delivery-secondary-btn"
                    onClick={() => {
                      if (
                        viewingPatient
                      ) {
                        handleViewPatient(
                          viewingPatient
                        );
                      }
                    }}
                    disabled={
                      isSaving
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="delivery-view-btn"
                    onClick={
                      handleSaveChanges
                    }
                    disabled={
                      isSaving
                    }
                  >
                    {isSaving
                      ? "Saving..."
                      : "💾 Save Changes"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="delivery-secondary-btn"
                    onClick={
                      closeModal
                    }
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="delivery-view-btn"
                    onClick={() => {
                      if (
                        viewingPatient
                      ) {
                        handleEditPatient(
                          viewingPatient
                        );
                      }
                    }}
                  >
                    ✎ Edit Delivery
                  </button>
                </>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default MedicineDelivery;