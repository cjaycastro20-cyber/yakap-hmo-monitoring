import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import db from "./firebase/firestore";
import "./Teleconsult.css";

/* =========================================================
   STORAGE
   Medicine month UI settings are stored in Firestore.
   Patient / Teleconsult / Company business data are Firestore.
========================================================= */

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_MEDICINE_MONTHS = [
  "SEPTEMBER 2026",
  "OCTOBER 2026",
  "NOVEMBER 2026",
  "DECEMBER 2026",
];

const TELECONSULT_STATUSES = [
  "Call Done",
  "--",
];

const DELIVERY_STATUSES = [
  "Pending",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const emptyPatient = {
  company: "",
  no: "",
  philHealthNo: "",
  lastName: "",
  firstName: "",
  middleName: "",
  dateOfBirth: "",
  address: "",
  age: "",
  contactNo: "",
  dateOfCall: "",
  nextTeleconsult: "",
  status: "Call Done",
  remarks: "",
  medicineDelivery: "No",
  monthlyDeliveries: [],
  medicinesByMonth: {},
};

/* =========================================================
   MEDICINE MASTER LIST
========================================================= */

const MEDICINE_LIST = [
  "Amlodipine - 5 mg tablet (as besilate/camsvlate)",
  "Amlodipine - 10 mg tablet (as besilate/camsvlate)",

  "Amoxicillin (as trihydrate) - 250 mg capsule",
  "Amoxicillin (as trihydrate) - 500 mg capsule",
  "Amoxicillin (as trihydrate) - 100 mg/ml, granules/powder for drops (suspension), 15 ml",
  "Amoxicillin (as trihydrate) - 250 mg/5 ml, granules/powder for suspension, 60 ml",

  "Aspirin - 80 mg tablet",
  "Aspirin - 100 mg tablet",
  "Aspirin - 300 mg tablet",
  "Aspirin - 325 mg tablet",

  "Chlorphenamine (Chlopheniramine) (as maleate) - 4 mg Tablet",
  "Chlorphenamine (Chlopheniramine) (as maleate) - 2.5 mg/5 mL syrup, 60 ml",

  "Ciprofloxacin - 250 mg tablet (as hydrochloride)",
  "Ciprofloxacin - 500 mg tablet (as hydrochloride)",

  "Clarithromycin - 250 mg base tablet",
  "Clarithromycin - 500 mg base tablet",
  "Clarithromycin - 125 mg/5 ml, granules/powder for suspension, 50 mL",
  "Clarithromycin - 250 mg/5 ml, granules/powder for suspension, 50 ml",

  "Co-Amoxiclav (Amoxicillin + Potassium Clavulanate) - 500 mg amoxicillin (as trihydrate) + 125 mg potassium clavulanate per tablet",
  "Co-Amoxiclav (Amoxicillin + Potassium Clavulanate) - 875 mg amoxicillin (as trihydrate) + 125 mg potassium clavulanate per tablet",
  "Co-Amoxiclav (Amoxicillin + Potassium Clavulanate) - 200 mg amoxicillin (as trihydrate) + 28.5 mg potassium clavulanate per 5 ml, granules/powder for suspension, 70 mL",
  "Co-Amoxiclav (Amoxicillin + Potassium Clavulanate) - 400 mg amoxicillin (as trihydrate) + 57 mg potassium clavulanate per 5 ml, granules/powder for suspension, 70 ml",
  "Co-Amoxiclav (Amoxicillin + Potassium Clavulanate) - 600 mg amoxicillin (as trihydrate) + 42.9 mg potassium clavulanate per 5 ml, granules/powder for suspension",

  "Cotrimoxazole (sulfamethoxazole + trimethoprim) - 400 mg sulfamethoxazole + 80 mg trimethoprim tablet/capsule (B)",
  "Cotrimoxazole (sulfamethoxazole + trimethoprim) - 800 mg sulfamethoxazole + 160 mg tablet (B)",
  "Cotrimoxazole (sulfamethoxazole + trimethoprim) - 200 mg sulfamethoxazole + 40 mg trimethoprim/5 ml suspension, 70mL",
  "Cotrimoxazole (sulfamethoxazole + trimethoprim) - 200 mg sulfamethoxazole + 40 mg trimethoprim/5 ml suspension, 120mL",
  "Cotrimoxazole (sulfamethoxazole + trimethoprim) - 400 mg sulfamethoxazole + 80 mg trimethoprim per 5 ml suspension, 60 ml",

  "Enalapril (as maleate) - 5 mg tablet",
  "Enalapril (as maleate) - 20 mg tablet",

  "Enalapril + Hydrochlorothiazide - 20 mg enalapril + 12.5 mg hydrochlorothiazide tablet",

  "Fluticasone (as propionate) + Salmeterol (as xinafoate) - Inhalation: DPI 100 micrograms fluticasone + 50 micrograms salmeterol x 28 doses and 60 doses with appropriate accompanying dispenser",
  "Fluticasone (as propionate) + Salmeterol (as xinafoate) - Inhalation: DPI 250 micrograms fluticasone + 50 micrograms salmeterol x 28 doses and 60 doses with appropriate accompanying dispenser",
  "Fluticasone (as propionate) + Salmeterol (as xinafoate) - Inhalation: DPI 500 micrograms fluticasone + 50 micrograms salmeterol x 28 doses and 60 doses with appropriate accompanying dispenser",
  "Fluticasone (as propionate) + Salmeterol (as xinafoate) - MDI: 50 micrograms fluticasone + 25 micrograms salmeterol x 120 actuations (with dose counter)",
  "Fluticasone (as propionate) + Salmeterol (as xinafoate) - MDI: 125 micrograms fluticasone + 25 micrograms salmeterol x 120 actuations",
  "Fluticasone (as propionate) + Salmeterol (as xinafoate) - MDI: 250 micrograms fluticasone + 25 micrograms salmeterol x 120 actuations",

  "Gliclazide - 30 mg MR tablet",
  "Gliclazide - 60 mg MR tablet",
  "Gliclazide - 80 mg tablet",

  "Hydrochlorothiazide - 12.5 mg tablet",
  "Hydrochlorothiazide - 25 mg tablet",

  "Losartan (as potassium salt) - 50 mg tablet",
  "Losartan (as potassium salt) - 100 mg tablet",

  "Metformin (as hydrochloride) - 500 mg tablet",
  "Metformin (as hydrochloride) - 500 mg film coated tablet",
  "Metformin (as hydrochloride) - 850 mg tablet",

  "Metoprolol (as tartrate) - 50 mg tablet",
  "Metoprolol (as tartrate) - 100 mg tablet",

  "Nitrofurantoin - 50 mg capsule (as macrocrystals)",
  "Nitrofurantoin - 100 mg capsule (as macrocrystals)",

  "Oral Rehydration Salts (ORS) - 20.5 sachet",

  "Paracetamol - 300 mg tablet",
  "Paracetamol - 500 mg tablet",
  "Paracetamol - 100 mg/mL drops, 15 mL (alcohol-free)",
  "Paracetamol - 120 mg/5 mL (125 mg/5 ml) syrup/suspension, 30 ml (alcohol-free)",
  "Paracetamol - 120 mg/5 mL (125 mg/5 ml) syrup/suspension, 60 mL (alcohol-free)",
  "Paracetamol - 120 mg/5 mL (125 mg/5 ml) syrup/suspension, 120 ml (alcohol-free)",
  "Paracetamol - 250 mg/5 ml syrup/suspension, 30 mL (alcohol-free)",
  "Paracetamol - 250 mg/5 mL syrup/suspension, 60 ml (alcohol-free)",
  "Paracetamol - 250 mg/5 ml syrup/suspension, 120 ml (alcohol-free)",
  "Paracetamol - Rectal: 125 mg suppository",
  "Paracetamol - Rectal: 250 mg suppository",

  "Prednisone - 5 mg tablet",
  "Prednisone - 10 mg tablet",
  "Prednisone - 20 mg tablet",
  "Prednisone - 10 mg/5 ml suspension, 60 ml",

  "Salbutamol (as sulfate) - 2 mg/5 ml syrup, 60 ml",
  "Salbutamol (as sulfate) - Dry Powder Inhaler (DPI): 200 micrograms/dose with appropriate accompanying dispenser",
  "Salbutamol (as sulfate) - Metered Dose Inhaler (MDI): 100 micrograms/dose x 200 actuations",
  "Salbutamol (as sulfate) - Breath Actuated MDI: 100 micrograms/dose x 200 actuations",
  "Salbutamol (as sulfate) - Resp. Soln.: (for nebulization) 1 mg/ml, 2.5 ml (unit dose)",
  "Salbutamol (as sulfate) - Resp. Soln.: (for nebulization) 2 mg/mL, 2.5 mL (unit dose)",

  "Ipratropium + Salbutamol - MDI: 20 micrograms ipratropium (as bromide) + 100 micrograms salbutamol x 200 doses x 10mL",
  "Ipratropium + Salbutamol - Resp. Soln.: (for nebulization) 500 micrograms ipratropium (as bromide anhydrous) + 2.5 mg salbutamol (as base) x 2.5 ml (unit dose)",

  "Simvastatin - 20 mg tablet",
  "Simvastatin - 40 mg tablet",
];

/* =========================================================
   HELPERS
========================================================= */

const getIcareValue = (record, key) => {
  if (!record) return "";

  if (
    record[key] !== undefined &&
    record[key] !== null
  ) {
    return record[key];
  }

  const alternateKey =
    key.charAt(0).toUpperCase() + key.slice(1);

  if (
    record[alternateKey] !== undefined &&
    record[alternateKey] !== null
  ) {
    return record[alternateKey];
  }

  return "";
};

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;

const createMedicineId = () =>
  createId("medicine");

const createDeliveryId = () =>
  createId("delivery");

const normalizeMonthName = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeCompanyName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const parseLocalDate = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = parseLocalDate(value);

  if (!date) return value;

  return date.toLocaleDateString("en-PH", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const addMonths = (dateString, months) => {
  const date = parseLocalDate(dateString);

  if (!date) return "";

  date.setMonth(date.getMonth() + months);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getNextMonthName = (monthName) => {
  if (!monthName) return "";

  const normalized =
    normalizeMonthName(monthName);

  const date = new Date(
    `${normalized} 1`
  );

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setMonth(date.getMonth() + 1);

  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  ).toUpperCase();
};

const normalizeMedicineList = (medicines) => {
  if (!Array.isArray(medicines)) {
    return [];
  }

  return medicines
    .filter(
      (medicine) =>
        medicine &&
        medicine.medicine &&
        Number(medicine.quantity) > 0
    )
    .map((medicine) => ({
      id:
        medicine.id ||
        createMedicineId(),

      medicine: String(
        medicine.medicine || ""
      ),

      quantity:
        Number(
          medicine.quantity
        ) || 0,
    }));
};

/* =========================================================
   MEDICINES BY MONTH
========================================================= */

const normalizeMedicinesByMonth = (
  medicinesByMonth,
  oldMedicines,
  months
) => {
  const result = {};

  const availableMonths =
    Array.isArray(months)
      ? months
      : [];

  availableMonths.forEach(
    (month) => {
      result[month] =
        normalizeMedicineList(
          medicinesByMonth?.[month]
        );
    }
  );

  const hasSavedMonthData =
    medicinesByMonth &&
    typeof medicinesByMonth === "object" &&
    Object.keys(
      medicinesByMonth
    ).length > 0;

  if (
    !hasSavedMonthData &&
    availableMonths.length > 0
  ) {
    result[
      availableMonths[0]
    ] =
      normalizeMedicineList(
        oldMedicines
      );
  }

  if (
    medicinesByMonth &&
    typeof medicinesByMonth === "object"
  ) {
    Object.keys(
      medicinesByMonth
    ).forEach((month) => {
      if (
        !Object.prototype.hasOwnProperty.call(
          result,
          month
        )
      ) {
        result[month] =
          normalizeMedicineList(
            medicinesByMonth[month]
          );
      }
    });
  }

  return result;
};

/* =========================================================
   MONTHLY DELIVERIES
========================================================= */

const generateMonthlyDeliveries = (
  firstDeliveryDate,
  existingDeliveries = [],
  months = []
) => {
  if (
    !firstDeliveryDate ||
    !Array.isArray(months) ||
    months.length === 0
  ) {
    return [];
  }

  const existing =
    Array.isArray(existingDeliveries)
      ? existingDeliveries
      : [];

  return months.map(
    (month, index) => {
      const existingDelivery =
        existing.find(
          (item) =>
            item?.month === month
        ) ||
        existing[index];

      return {
        id:
          existingDelivery?.id ||
          createDeliveryId(),

        month,

        scheduledDate:
          index === 0
            ? firstDeliveryDate
            : addMonths(
                firstDeliveryDate,
                index
              ),

        status:
          existingDelivery?.status ||
          "Pending",

        date:
          existingDelivery?.date ||
          "",

        medicines:
          normalizeMedicineList(
            existingDelivery?.medicines
          ),
      };
    }
  );
};

const normalizeMonthlyDeliveries = (
  monthlyDeliveries = [],
  firstDelivery = null,
  subsequentDeliveries = [],
  months = []
) => {
  if (
    !Array.isArray(months) ||
    months.length === 0
  ) {
    return [];
  }

  const existing =
    Array.isArray(monthlyDeliveries)
      ? monthlyDeliveries
      : [];

  return months.map(
    (month, index) => {
      const existingDelivery =
        existing.find(
          (item) =>
            item?.month === month
        ) ||
        existing[index];

      let scheduledDate =
        existingDelivery?.scheduledDate ||
        "";

      if (!scheduledDate) {
        if (index === 0) {
          scheduledDate =
            firstDelivery?.scheduledDate ||
            firstDelivery?.date ||
            firstDelivery ||
            "";
        } else {
          const subsequent =
            Array.isArray(
              subsequentDeliveries
            )
              ? subsequentDeliveries[
                  index - 1
                ]
              : null;

          scheduledDate =
            subsequent?.scheduledDate ||
            subsequent?.date ||
            subsequent ||
            "";
        }
      }

      return {
        id:
          existingDelivery?.id ||
          createDeliveryId(),

        month,

        scheduledDate,

        status:
          existingDelivery?.status ||
          "Pending",

        date:
          existingDelivery?.date ||
          "",

        medicines:
          normalizeMedicineList(
            existingDelivery?.medicines
          ),
      };
    }
  );
};

/* =========================================================
   COMPONENT
========================================================= */

function Teleconsult() {
  const [
    icareCompletedPatients,
    setIcareCompletedPatients,
  ] = useState([]);

  const [
    teleconsultExtraData,
    setTeleconsultExtraData,
  ] = useState({});

  const [
    medicineMonths,
    setMedicineMonths,
  ] = useState(
    DEFAULT_MEDICINE_MONTHS
  );

  /* =======================================================
     COMPANY STATE
  ======================================================= */

  const [
    companies,
    setCompanies,
  ] = useState([]);

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    "All Companies"
  );

  const [
    showCompanyModal,
    setShowCompanyModal,
  ] = useState(false);

  const [
    newCompanyName,
    setNewCompanyName,
  ] = useState("");

  const [
    companyError,
    setCompanyError,
  ] = useState("");

  /* =======================================================
     OTHER STATE
  ======================================================= */

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    showPatientModal,
    setShowPatientModal,
  ] = useState(false);

  const [
    editingPatient,
    setEditingPatient,
  ] = useState(null);

  const [
    viewingPatient,
    setViewingPatient,
  ] = useState(null);

  const [
    newPatient,
    setNewPatient,
  ] = useState(
    emptyPatient
  );

  const [
    medicineSearch,
    setMedicineSearch,
  ] = useState("");

  const [
    selectedMedicine,
    setSelectedMedicine,
  ] = useState("");

  const [
    medicineQty,
    setMedicineQty,
  ] = useState("");

  const [
    showMedicineDropdown,
    setShowMedicineDropdown,
  ] = useState(false);

  const [
    activeMedicineMonth,
    setActiveMedicineMonth,
  ] = useState("");

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  /* =======================================================
     ACTIVE MONTH
  ======================================================= */

  useEffect(() => {
    if (!medicineMonths.length) {
      setActiveMedicineMonth("");
      return;
    }

    setActiveMedicineMonth(
      (current) =>
        medicineMonths.includes(current)
          ? current
          : medicineMonths[0]
    );
  }, [medicineMonths]);

  /* =======================================================
     LOAD MEDICINE MONTH SETTINGS FROM FIRESTORE
  ======================================================= */

  useEffect(() => {
    const settingsRef =
      doc(
        db,
        "yakapSettings",
        "teleconsult"
      );

    const unsubscribe =
      onSnapshot(
        settingsRef,
        (snap) => {
          const data =
            snap.data();

          if (
            Array.isArray(
              data?.medicineMonths
            ) &&
            data.medicineMonths.length
          ) {
            setMedicineMonths(
              data.medicineMonths.map(
                normalizeMonthName
              )
            );
          } else {
            setMedicineMonths(
              DEFAULT_MEDICINE_MONTHS
            );
          }
        },
        (error) => {
          console.error(
            "Error loading Teleconsult settings from Firestore:",
            error
          );

          setMedicineMonths(
            DEFAULT_MEDICINE_MONTHS
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  /* =======================================================
     PERSIST MEDICINE MONTH SETTINGS
  ======================================================= */

  const persistMedicineMonths =
    async (months) => {
      await setDoc(
        doc(
          db,
          "yakapSettings",
          "teleconsult"
        ),
        {
          medicineMonths:
            months,
          updatedAt:
            new Date().toISOString(),
        },
        {
          merge: true,
        }
      );
    };

  /* =======================================================
     LOAD ICARE FROM FIRESTORE
  ======================================================= */

  useEffect(() => {
    const patientsRef =
      collection(
        db,
        "icarePatients"
      );

    const unsubscribe =
      onSnapshot(
        patientsRef,
        (snapshot) => {
          const patients =
            snapshot.docs.map(
              (docSnapshot) => ({
                id:
                  docSnapshot.id,
                ...docSnapshot.data(),
              })
            );

          const completed = patients.filter((patient) => {
  const fpe = getIcareValue(patient, "fpe");

  return ["DONE", "COMPLETED"].includes(
    String(fpe || "").trim().toUpperCase()
  );
});

          setIcareCompletedPatients(
            completed
          );
        },
        (error) => {
          console.error(
            "Error loading ICARE patients from Firestore:",
            error
          );

          setIcareCompletedPatients(
            []
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  /* =======================================================
     LOAD TELECONSULT FROM FIRESTORE
  ======================================================= */

  useEffect(() => {
    const teleconsultRef =
      collection(
        db,
        "teleconsultPatients"
      );

    const unsubscribe =
      onSnapshot(
        teleconsultRef,
        (snapshot) => {
          const data = {};

          snapshot.docs.forEach(
            (docSnapshot) => {
              data[
                docSnapshot.id
              ] = {
                id:
                  docSnapshot.id,
                ...docSnapshot.data(),
              };
            }
          );

          setTeleconsultExtraData(
            data
          );
        },
        (error) => {
          console.error(
            "Error loading Teleconsult data from Firestore:",
            error
          );

          setTeleconsultExtraData(
            {}
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  /* =======================================================
     LOAD COMPANIES FROM FIRESTORE
  ======================================================= */

  useEffect(() => {
    const companiesRef =
      collection(
        db,
        "yakapCompanies"
      );

    const unsubscribe =
      onSnapshot(
        companiesRef,
        (snapshot) => {
          const firebaseCompanies =
            snapshot.docs
              .map(
                (docSnapshot) =>
                  docSnapshot.data()?.name
              )
              .map(
                normalizeCompanyName
              )
              .filter(Boolean);

          setCompanies(
            Array.from(
              new Map(
                firebaseCompanies.map(
                  (company) => [
                    company.toLowerCase(),
                    company,
                  ]
                )
              ).values()
            ).sort((a, b) =>
              a.localeCompare(b)
            )
          );
        },
        (error) => {
          console.error(
            "Error loading companies from Firestore:",
            error
          );

          setCompanies([]);
        }
      );

    return () =>
      unsubscribe();
  }, []);

  /* =======================================================
     BUILD COMPANY LIST FROM COMPLETED ICARE
  ======================================================= */

  useEffect(() => {
    if (
      !icareCompletedPatients.length
    ) {
      return;
    }

    const icareCompanies =
      icareCompletedPatients
        .map((patient) =>
          normalizeCompanyName(
            getIcareValue(
              patient,
              "company"
            )
          )
        )
        .filter(Boolean);

    if (
      !icareCompanies.length
    ) {
      return;
    }

    setCompanies(
      (prev) => {
        const existing =
          new Map(
            prev.map(
              (company) => [
                company.toLowerCase(),
                company,
              ]
            )
          );

        let changed = false;

        icareCompanies.forEach(
          (company) => {
            const key =
              company.toLowerCase();

            if (
              !existing.has(key)
            ) {
              existing.set(
                key,
                company
              );

              changed = true;
            }
          }
        );

        return changed
          ? Array.from(
              existing.values()
            ).sort((a, b) =>
              a.localeCompare(b)
            )
          : prev;
      }
    );
  }, [icareCompletedPatients]);

  /* =======================================================
     COMPANY MANAGEMENT
  ======================================================= */

  const handleOpenCompanyModal =
    () => {
      setNewCompanyName("");
      setCompanyError("");
      setShowCompanyModal(true);
    };

  const handleCloseCompanyModal =
    () => {
      setShowCompanyModal(false);
      setNewCompanyName("");
      setCompanyError("");
    };

  const handleAddCompany = async (
    event
  ) => {
    event.preventDefault();

    const company =
      normalizeCompanyName(
        newCompanyName
      );

    if (!company) {
      setCompanyError(
        "Please enter a company name."
      );

      return;
    }

    const duplicate =
      companies.some(
        (existingCompany) =>
          existingCompany
            .toLowerCase() ===
          company.toLowerCase()
      );

    if (duplicate) {
      setCompanyError(
        "This company already exists."
      );

      return;
    }

    try {
      const companyId =
        encodeURIComponent(
          company
        );

      await setDoc(
        doc(
          db,
          "yakapCompanies",
          companyId
        ),
        {
          name: company,
          createdAt:
            new Date().toISOString(),
          updatedAt:
            new Date().toISOString(),
        },
        {
          merge: true,
        }
      );

      setSelectedCompany(
        company
      );

      setNewCompanyName("");
      setCompanyError("");
      setShowCompanyModal(false);
    } catch (error) {
      console.error(
        "Error adding company:",
        error
      );

      setCompanyError(
        error?.message ||
          "Unable to save company."
      );
    }
  };

  /* =======================================================
     BUILD TELECONSULT PATIENTS
  ======================================================= */

  const teleconsultPatients =
    useMemo(() => {
      const result = [];
      const usedIds = new Set();

      icareCompletedPatients.forEach(
        (icarePatient) => {
          const icareId =
            getIcareValue(
              icarePatient,
              "id"
            );

          const philHealth =
            getIcareValue(
              icarePatient,
              "philhealthNo"
            );

          const lastName =
            getIcareValue(
              icarePatient,
              "lastName"
            );

          const firstName =
            getIcareValue(
              icarePatient,
              "firstName"
            );

          const middleName =
            getIcareValue(
              icarePatient,
              "middleName"
            );

          const stableId =
            String(
              icareId ||
                [
                  philHealth,
                  lastName,
                  firstName,
                  middleName,
                ]
                  .join("-")
                  .toLowerCase()
            );

          if (!stableId) {
            return;
          }

          if (
            usedIds.has(stableId)
          ) {
            return;
          }

          usedIds.add(stableId);

          const extra =
            teleconsultExtraData[
              stableId
            ] || {};

          const monthlyDeliveries =
            normalizeMonthlyDeliveries(
              extra.monthlyDeliveries,
              extra.firstDelivery,
              extra.subsequentDeliveries,
              medicineMonths
            );

          const medicinesByMonth =
            normalizeMedicinesByMonth(
              extra.medicinesByMonth,
              extra.medicines,
              medicineMonths
            );

          monthlyDeliveries.forEach(
            (delivery) => {
              if (
                Array.isArray(
                  delivery.medicines
                ) &&
                delivery.medicines
                  .length > 0
              ) {
                medicinesByMonth[
                  delivery.month
                ] =
                  normalizeMedicineList(
                    delivery.medicines
                  );
              }
            }
          );

          result.push({
            id: stableId,

            company:
              extra.company ||
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
              philHealth,

            lastName,

            firstName,

            middleName,

            dateOfBirth:
              getIcareValue(
                icarePatient,
                "dateOfBirth"
              ),

            address:
              extra.address ||
              getIcareValue(
                icarePatient,
                "address"
              ),

            age:
              getIcareValue(
                icarePatient,
                "age"
              ),

            contactNo:
  extra.contactNo ??
  (
    getIcareValue(
      icarePatient,
      "contactNumber"
    ) ||
    getIcareValue(
      icarePatient,
      "contactNo"
    )
  ),
            dateOfCall:
              extra.dateOfCall ||
              "",

            nextTeleconsult:
              extra.nextTeleconsult ||
              "",

            status:
              extra.status ||
              "",

            remarks:
              extra.remarks ||
              "",

            medicineDelivery:
              extra.medicineDelivery ||
              "No",

            monthlyDeliveries,

            medicinesByMonth,
          });
        }
      );

      return result;
    }, [
      icareCompletedPatients,
      teleconsultExtraData,
      medicineMonths,
    ]);

  /* =======================================================
     SEARCH + COMPANY FILTER
  ======================================================= */

  const filteredPatients =
    useMemo(() => {
      const search =
        searchTerm
          .toLowerCase()
          .trim();

      return teleconsultPatients.filter(
        (patient) => {
          const matchesCompany =
            selectedCompany ===
              "All Companies" ||
            normalizeCompanyName(
              patient.company
            ).toLowerCase() ===
              normalizeCompanyName(
                selectedCompany
              ).toLowerCase();

          if (!matchesCompany) {
            return false;
          }

          if (!search) {
            return true;
          }

          const values = [
            patient.company,
            patient.no,
            patient.philHealthNo,
            patient.lastName,
            patient.firstName,
            patient.middleName,
            patient.contactNo,
          ];

          return values.some(
            (value) =>
              String(value || "")
                .toLowerCase()
                .includes(search)
          );
        }
      );
    }, [
      teleconsultPatients,
      searchTerm,
      selectedCompany,
    ]);

  /* =======================================================
   SUMMARY — RESPECTS SELECTED COMPANY
======================================================= */

const totalPatientEndorsed =
  filteredPatients.length;

const totalCallDone =
  filteredPatients.filter(
    (patient) =>
      patient.status === "Call Done"
  ).length;

const totalNotAvailable =
  filteredPatients.filter(
    (patient) =>
      patient.status === "Not Available"
  ).length;

const totalMedicineDelivery =
  filteredPatients.filter(
    (patient) =>
      patient.medicineDelivery === "Yes"
  ).length;

  /* =======================================================
     MEDICINE SEARCH
  ======================================================= */

  const filteredMedicines =
    useMemo(() => {
      const search =
        medicineSearch
          .toLowerCase()
          .trim();

      if (!search) {
        return MEDICINE_LIST;
      }

      return MEDICINE_LIST.filter(
        (medicine) =>
          medicine
            .toLowerCase()
            .includes(search)
      );
    }, [medicineSearch]);

  /* =======================================================
     FORM INPUT
  ======================================================= */

  const handleInputChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setNewPatient(
      (prev) => ({
        ...prev,
        [name]: value,
      })
    );
  };

  const handleContactNumberChange =
    (event) => {
      let value =
        event.target.value.replace(
          /\D/g,
          ""
        );

      if (
        value.startsWith("63")
      ) {
        value =
          value.slice(2);
      }

      if (
        value.startsWith("0")
      ) {
        value =
          value.slice(1);
      }

      value =
        value.slice(0, 10);

      setNewPatient(
        (prev) => ({
          ...prev,
          contactNo: value,
        })
      );
    };

  /* =======================================================
     MEDICINE FORM
  ======================================================= */

  const resetMedicineForm =
    () => {
      setSelectedMedicine("");
      setMedicineSearch("");
      setMedicineQty("");
      setShowMedicineDropdown(
        false
      );
    };

  const handleSelectMedicine =
    (medicine) => {
      setSelectedMedicine(
        medicine
      );

      setMedicineSearch(
        medicine
      );

      setShowMedicineDropdown(
        false
      );
    };

  /* =======================================================
     ADD MEDICINE MONTH
  ======================================================= */

  const handleAddMedicineMonth =
    async () => {
      if (
        !medicineMonths.length
      ) {
        const firstMonth =
          "SEPTEMBER 2026";

        const updatedMonths = [
          firstMonth,
        ];

        setMedicineMonths(
          updatedMonths
        );

        setNewPatient(
          (prev) => ({
            ...prev,

            medicinesByMonth: {
              ...(prev.medicinesByMonth ||
                {}),
              [firstMonth]: [],
            },
          })
        );

        setActiveMedicineMonth(
          firstMonth
        );

        resetMedicineForm();

        try {
          await persistMedicineMonths(
            updatedMonths
          );
        } catch (error) {
          console.error(
            "Error saving medicine months to Firestore:",
            error
          );

          alert(
            "Unable to save the medicine month settings."
          );
        }

        return;
      }

      const lastMonth =
        medicineMonths[
          medicineMonths.length -
            1
        ];

      const nextMonth =
        getNextMonthName(
          lastMonth
        );

      if (!nextMonth) {
        alert(
          "Unable to determine the next month."
        );

        return;
      }

      if (
        medicineMonths.includes(
          nextMonth
        )
      ) {
        return;
      }

      const updatedMonths = [
        ...medicineMonths,
        nextMonth,
      ];

      setMedicineMonths(
        updatedMonths
      );

      setNewPatient(
        (prev) => ({
          ...prev,

          medicinesByMonth: {
            ...(prev.medicinesByMonth ||
              {}),
            [nextMonth]: [],
          },
        })
      );

      setActiveMedicineMonth(
        nextMonth
      );

      resetMedicineForm();

      try {
        await persistMedicineMonths(
          updatedMonths
        );
      } catch (error) {
        console.error(
          "Error saving medicine months to Firestore:",
          error
        );

        alert(
          "Unable to save the medicine month settings."
        );
      }
    };

  /* =======================================================
     ADD MEDICINE
  ======================================================= */

  const handleAddMedicine = (
    month
  ) => {
    if (!month) {
      alert(
        "Please select a medicine month."
      );

      return;
    }

    if (!selectedMedicine) {
      alert(
        "Please select a medicine."
      );

      return;
    }

    if (
      !medicineQty ||
      Number(medicineQty) <= 0
    ) {
      alert(
        "Please enter a valid quantity."
      );

      return;
    }

    const newMedicine = {
      id: createMedicineId(),
      medicine:
        selectedMedicine,
      quantity:
        Number(medicineQty),
    };

    setNewPatient(
      (prev) => ({
        ...prev,

        medicinesByMonth: {
          ...(prev.medicinesByMonth ||
            {}),

          [month]: [
            ...(prev
              .medicinesByMonth?.[
              month
            ] || []),

            newMedicine,
          ],
        },
      })
    );

    resetMedicineForm();
  };

  /* =======================================================
     REMOVE MEDICINE
  ======================================================= */

  const handleRemoveMedicine = (
    month,
    medicineId
  ) => {
    setNewPatient(
      (prev) => ({
        ...prev,

        medicinesByMonth: {
          ...(prev.medicinesByMonth ||
            {}),

          [month]: (
            prev
              .medicinesByMonth?.[
              month
            ] || []
          ).filter(
            (medicine) =>
              medicine.id !==
              medicineId
          ),
        },
      })
    );
  };

  /* =======================================================
     UPDATE DELIVERY
  ======================================================= */

  const updateMonthlyDelivery = (
    deliveryId,
    field,
    value
  ) => {
    setNewPatient(
      (prev) => {
        const current =
          Array.isArray(
            prev.monthlyDeliveries
          )
            ? prev.monthlyDeliveries
            : [];

        const index =
          current.findIndex(
            (delivery) =>
              delivery.id ===
              deliveryId
          );

        if (index === -1) {
          return prev;
        }

        if (
          field ===
            "scheduledDate" &&
          index === 0
        ) {
          if (!value) {
            return {
              ...prev,

              monthlyDeliveries:
                current.map(
                  (
                    delivery,
                    i
                  ) =>
                    i === 0
                      ? {
                          ...delivery,
                          scheduledDate:
                            "",
                        }
                      : delivery
                ),
            };
          }

          const generated =
            generateMonthlyDeliveries(
              value,
              current,
              medicineMonths
            );

          return {
            ...prev,

            monthlyDeliveries:
              generated.map(
                (delivery) => ({
                  ...delivery,

                  medicines:
                    normalizeMedicineList(
                      prev
                        .medicinesByMonth?.[
                        delivery.month
                      ]
                    ),
                })
              ),
          };
        }

        return {
          ...prev,

          monthlyDeliveries:
            current.map(
              (delivery) =>
                delivery.id ===
                deliveryId
                  ? {
                      ...delivery,
                      [field]:
                        value,
                    }
                  : delivery
            ),
        };
      }
    );
  };

  /* =======================================================
     EDIT
  ======================================================= */

  const handleEditPatient =
    (patient) => {
      setEditingPatient(
        patient
      );

      const monthlyDeliveries =
        normalizeMonthlyDeliveries(
          patient.monthlyDeliveries,
          patient.firstDelivery,
          patient.subsequentDeliveries,
          medicineMonths
        );

      const medicinesByMonth =
        normalizeMedicinesByMonth(
          patient.medicinesByMonth,
          patient.medicines,
          medicineMonths
        );

      monthlyDeliveries.forEach(
        (delivery) => {
          if (
            Array.isArray(
              delivery.medicines
            ) &&
            delivery.medicines
              .length > 0
          ) {
            medicinesByMonth[
              delivery.month
            ] =
              normalizeMedicineList(
                delivery.medicines
              );
          }
        }
      );

      medicineMonths.forEach(
        (month) => {
          if (
            !Object.prototype.hasOwnProperty.call(
              medicinesByMonth,
              month
            )
          ) {
            medicinesByMonth[
              month
            ] = [];
          }
        }
      );

      setNewPatient({
        ...emptyPatient,

        company:
          patient.company ||
          "",

        no:
          patient.no ||
          "",

        philHealthNo:
          patient.philHealthNo ||
          "",

        lastName:
          patient.lastName ||
          "",

        firstName:
          patient.firstName ||
          "",

        middleName:
          patient.middleName ||
          "",

        dateOfBirth:
          patient.dateOfBirth ||
          "",

        address:
          patient.address ||
          "",

        age:
          patient.age ||
          "",

        contactNo:
          patient.contactNo ||
          "",

        dateOfCall:
          patient.dateOfCall ||
          "",

        nextTeleconsult:
          patient.nextTeleconsult ||
          "",

        status:
          patient.status ||
          "Call Done",

        remarks:
          patient.remarks ||
          "",

        medicineDelivery:
          patient.medicineDelivery ||
          "No",

        monthlyDeliveries,

        medicinesByMonth,
      });

      setActiveMedicineMonth(
        medicineMonths[0] ||
          ""
      );

      resetMedicineForm();

      setShowPatientModal(
        true
      );

      setViewingPatient(
        null
      );
    };

  /* =======================================================
     CLOSE EDIT
  ======================================================= */

  const handleClosePatientModal =
    () => {
      setShowPatientModal(false);
      setEditingPatient(null);

      setNewPatient({
        ...emptyPatient,

        monthlyDeliveries:
          [],

        medicinesByMonth:
          Object.fromEntries(
            medicineMonths.map(
              (month) => [
                month,
                [],
              ]
            )
          ),
      });

      setActiveMedicineMonth(
        medicineMonths[0] ||
          ""
      );

      resetMedicineForm();
    };

  /* =======================================================
     SAVE PATIENT TO FIRESTORE
  ======================================================= */

  const handleSavePatient =
    async (event) => {
      event.preventDefault();

      if (!editingPatient) {
        alert(
          "Teleconsult records are automatically created from ICARE when FPE is COMPLETED."
        );

        return;
      }

      setIsSaving(true);

      try {
        const id =
          String(
            editingPatient.id
          );

        const endorsed =
          newPatient.medicineDelivery ===
          "Yes";

        const medicinesByMonth =
          {};

        medicineMonths.forEach(
          (month) => {
            medicinesByMonth[
              month
            ] =
              normalizeMedicineList(
                newPatient
                  .medicinesByMonth?.[
                  month
                ]
              );
          }
        );

        const totalMedicines =
          Object.values(
            medicinesByMonth
          ).reduce(
            (
              total,
              medicines
            ) =>
              total +
              medicines.length,
            0
          );

        if (
          endorsed &&
          totalMedicines === 0
        ) {
          alert(
            "Please add at least one prescribed medicine before endorsing the patient to Medicine Delivery."
          );

          return;
        }

        let monthlyDeliveries =
          Array.isArray(
            newPatient.monthlyDeliveries
          )
            ? newPatient.monthlyDeliveries
            : [];

        if (endorsed) {
          const firstDeliveryDate =
            monthlyDeliveries[0]
              ?.scheduledDate;

          if (!firstDeliveryDate) {
            alert(
              "Please enter the Month 1 scheduled delivery date first."
            );

            return;
          }

          monthlyDeliveries =
            generateMonthlyDeliveries(
              firstDeliveryDate,
              monthlyDeliveries,
              medicineMonths
            );

          monthlyDeliveries =
            monthlyDeliveries.map(
              (delivery) => ({
                ...delivery,

                medicines:
                  medicinesByMonth[
                    delivery.month
                  ] || [],
              })
            );
        } else {
          monthlyDeliveries =
            [];
        }

        /* ===============================================
           EXISTING FIRESTORE DATA
        =============================================== */

        const existing =
          teleconsultExtraData[
            id
          ] || {};

        const now =
          new Date().toISOString();

        /* ===============================================
           TELECONSULT FIRESTORE DATA
        =============================================== */

        const teleconsultData = {
          ...existing,

          company:
            normalizeCompanyName(
              newPatient.company
            ),

          no:
            newPatient.no,

          philHealthNo:
            newPatient.philHealthNo,

          lastName:
            newPatient.lastName,

          firstName:
            newPatient.firstName,

          middleName:
            newPatient.middleName,

          dateOfBirth:
            newPatient.dateOfBirth,

          address:
            newPatient.address,

          age:
            newPatient.age,

          contactNo:
            newPatient.contactNo,

          dateOfCall:
            newPatient.dateOfCall,

          nextTeleconsult:
            newPatient.nextTeleconsult,

          status:
            newPatient.status,

          remarks:
            newPatient.remarks,

          medicineDelivery:
            endorsed
              ? "Yes"
              : "No",

          monthlyDeliveries,

          medicinesByMonth:
            endorsed
              ? medicinesByMonth
              : Object.fromEntries(
                  medicineMonths.map(
                    (month) => [
                      month,
                      [],
                    ]
                  )
                ),

          updatedAt: now,

          createdAt:
            existing.createdAt ||
            now,
        };

        /* ===============================================
           SAVE ONLY TELECONSULT
           ICARE IS NOT TOUCHED.
        =============================================== */

        await setDoc(
          doc(
            db,
            "teleconsultPatients",
            id
          ),
          teleconsultData,
          {
            merge: true,
          }
        );

        handleClosePatientModal();
      } catch (error) {
        console.error(
          "Teleconsult save error:",
          error
        );

        alert(
          `Unable to save Teleconsult changes.\n\nCode: ${
            error?.code ||
            "Unknown"
          }\n\nMessage: ${
            error?.message ||
            "Unknown Firebase error"
          }`
        );
      } finally {
        setIsSaving(false);
      }
    };

  /* =======================================================
     DELETE TELECONSULT ONLY
  ======================================================= */

  const handleDeletePatient =
    async (patient) => {
      const fullName = [
        patient.firstName,
        patient.middleName,
        patient.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      const confirmed =
        window.confirm(
          `Remove ${
            fullName ||
            "this patient"
          } from Teleconsult monitoring?\n\nThis will NOT delete the ICARE Registration record.`
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteDoc(
          doc(
            db,
            "teleconsultPatients",
            String(
              patient.id
            )
          )
        );

        setViewingPatient(
          null
        );
      } catch (error) {
        console.error(
          "Teleconsult delete error:",
          error
        );

        alert(
          `Unable to remove Teleconsult record.\n\nCode: ${
            error?.code ||
            "Unknown"
          }\n\nMessage: ${
            error?.message ||
            "Unknown Firebase error"
          }`
        );
      }
    };

  /* =======================================================
     VIEW
  ======================================================= */

  const handleViewPatient =
    (patient) => {
      setViewingPatient(
        patient
      );
    };

  /* =======================================================
     MEDICINE COUNTS
  ======================================================= */

  const getMonthMedicineCount =
    (
      medicinesByMonth,
      month
    ) =>
      medicinesByMonth?.[
        month
      ]?.length || 0;

  const getTotalMedicineCount =
    (
      medicinesByMonth
    ) =>
      medicineMonths.reduce(
        (
          total,
          month
        ) =>
          total +
          getMonthMedicineCount(
            medicinesByMonth,
            month
          ),
        0
      );

  /* =======================================================
     CURRENT MONTH MEDICINES
  ======================================================= */

  const currentMonthMedicines =
    newPatient
      .medicinesByMonth?.[
      activeMedicineMonth
    ] || [];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="teleconsult-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="teleconsult-header">

        <div>
          <h1>
            Teleconsult / HyperCare Monitoring
          </h1>

          <p>
            Patients with completed FPE from ICARE Registration.
          </p>
        </div>

        <div className="teleconsult-company-controls">

          <div className="teleconsult-company-select-wrapper">

            <label>
              Company
            </label>

            <select
              value={
                selectedCompany
              }
              onChange={(
                event
              ) =>
                setSelectedCompany(
                  event.target
                    .value
                )
              }
            >
              <option value="All Companies">
                All Companies
              </option>

              {companies.map(
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
            className="teleconsult-add-company-btn"
            onClick={
              handleOpenCompanyModal
            }
          >
            ＋ Add Company
          </button>

        </div>

      </div>

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <div className="teleconsult-summary-grid">

        <div className="teleconsult-summary-card">
          <div className="teleconsult-summary-icon">
            👥
          </div>

          <div>
            <span>
              Total Patient Endorsed
            </span>

            <strong>
              {
                totalPatientEndorsed
              }
            </strong>
          </div>
        </div>

        <div className="teleconsult-summary-card">
          <div className="teleconsult-summary-icon">
            📞
          </div>

          <div>
            <span>
              Total Call Done
            </span>

            <strong>
              {totalCallDone}
            </strong>
          </div>
        </div>

        <div className="teleconsult-summary-card">
          <div className="teleconsult-summary-icon">
            ⚠️
          </div>

          <div>
            <span>
              Total Not Available
            </span>

            <strong>
              {
                totalNotAvailable
              }
            </strong>
          </div>
        </div>

        <div className="teleconsult-summary-card">
          <div className="teleconsult-summary-icon">
            💊
          </div>

          <div>
            <span>
              Total Endorsed to Medicine Delivery
            </span>

            <strong>
              {
                totalMedicineDelivery
              }
            </strong>
          </div>
        </div>

      </div>

      {/* ===================================================
          TABLE
      =================================================== */}

      <div className="teleconsult-table-card">

        <div className="teleconsult-table-header">

          <div>
            <h2>
              Teleconsult Records
            </h2>

            <p>
              Automatically endorsed from ICARE when FPE is COMPLETED.
            </p>
          </div>

          <div className="teleconsult-search-box">

            <span className="teleconsult-search-icon">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search PhilHealth No. / Last Name / First Name"
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target
                    .value
                )
              }
            />

          </div>

        </div>

        <div className="teleconsult-table-wrapper">

          <table className="teleconsult-table">

            <thead>
              <tr>
                <th>Company</th>
                <th>No.</th>
                <th>PhilHealth No.</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Middle Name</th>
                <th>Date of Birth</th>
                <th>Address</th>
                <th>Age</th>
                <th>Contact No.</th>
                <th>Date of Call</th>
                <th>Schedule Next Teleconsult</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Endorsed to Medicine Delivery</th>
                <th>Monthly Deliveries</th>
                <th>Medicines</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredPatients.length >
              0 ? (
                filteredPatients.map(
                  (patient) => (
                    <tr
                      key={
                        patient.id
                      }
                    >

                      <td>
                        {
                          patient.company ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          patient.no ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          patient.philHealthNo ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          patient.lastName ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          patient.firstName ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          patient.middleName ||
                          "—"
                        }
                      </td>

                      <td>
                        {formatDate(
                          patient.dateOfBirth
                        )}
                      </td>

                      <td>
                        {
                          patient.address ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          patient.age ||
                          "—"
                        }
                      </td>

                      <td>
                        {patient.contactNo
                          ? `+63 ${patient.contactNo}`
                          : "—"}
                      </td>

                      <td>
                        {formatDate(
                          patient.dateOfCall
                        )}
                      </td>

                      <td>
                        {formatDate(
                          patient.nextTeleconsult
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            patient.status ===
                            "Call Done"
                              ? "teleconsult-status done"
                              : "teleconsult-status unavailable"
                          }
                        >
                          {
                            patient.status ||
                            "—"
                          }
                        </span>
                      </td>

                      <td>
                        {
                          patient.remarks ||
                          "—"
                        }
                      </td>

                      <td>
                        <span
                          className={
                            patient.medicineDelivery ===
                            "Yes"
                              ? "teleconsult-delivery yes"
                              : "teleconsult-delivery no"
                          }
                        >
                          {
                            patient.medicineDelivery ||
                            "No"
                          }
                        </span>
                      </td>

                      <td>
                        {patient
                          .monthlyDeliveries
                          ?.length ? (
                          <span className="medicine-count-badge">
                            📦{" "}
                            {
                              patient
                                .monthlyDeliveries
                                .length
                            }
                          </span>
                        ) : (
                          <span className="medicine-none">
                            None
                          </span>
                        )}
                      </td>

                      <td>
                        {getTotalMedicineCount(
                          patient.medicinesByMonth
                        ) > 0 ? (
                          <span className="medicine-count-badge">
                            💊{" "}
                            {getTotalMedicineCount(
                              patient.medicinesByMonth
                            )}
                          </span>
                        ) : (
                          <span className="medicine-none">
                            None
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="teleconsult-actions">

                          <button
                            type="button"
                            className="teleconsult-view-btn"
                            title="View"
                            onClick={() =>
                              handleViewPatient(
                                patient
                              )
                            }
                          >
                            👁
                          </button>

                          <button
                            type="button"
                            className="teleconsult-edit-btn"
                            title="Edit"
                            onClick={() =>
                              handleEditPatient(
                                patient
                              )
                            }
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            className="teleconsult-delete-btn"
                            title="Remove"
                            onClick={() =>
                              handleDeletePatient(
                                patient
                              )
                            }
                          >
                            🗑
                          </button>

                        </div>
                      </td>

                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan="18"
                    className="teleconsult-empty"
                  >
                    <div>
                      👥
                    </div>

                    <strong>
                      No Teleconsult Patients
                    </strong>

                    <p>
                      Patients will automatically appear here when their ICARE FPE is COMPLETED.
                    </p>
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ===================================================
          ADD COMPANY MODAL
      =================================================== */}

      {showCompanyModal && (
        <div
          className="teleconsult-modal-overlay"
          onClick={
            handleCloseCompanyModal
          }
        >

          <div
            className="teleconsult-modal teleconsult-company-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="teleconsult-modal-header">

              <div>
                <h2>
                  Add Company
                </h2>

                <p>
                  Add a company to the company list.
                </p>
              </div>

              <button
                type="button"
                className="teleconsult-modal-close"
                onClick={
                  handleCloseCompanyModal
                }
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={
                handleAddCompany
              }
            >

              <div className="teleconsult-modal-body">

                <div className="teleconsult-section">

                  <div className="teleconsult-field">

                    <label>
                      Company Name
                    </label>

                    <input
                      type="text"
                      value={
                        newCompanyName
                      }
                      onChange={(
                        event
                      ) => {
                        setNewCompanyName(
                          event.target
                            .value
                        );

                        if (
                          companyError
                        ) {
                          setCompanyError(
                            ""
                          );
                        }
                      }}
                      placeholder="Enter company name"
                      autoFocus
                    />

                    {companyError && (
                      <small className="teleconsult-error">
                        {
                          companyError
                        }
                      </small>
                    )}

                  </div>

                </div>

              </div>

              <div className="teleconsult-modal-footer">

                <button
                  type="button"
                  className="teleconsult-cancel-btn"
                  onClick={
                    handleCloseCompanyModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="teleconsult-save-btn"
                >
                  ＋ Add Company
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ===================================================
          VIEW MODAL
      =================================================== */}

      {viewingPatient && (
        <div
          className="teleconsult-modal-overlay"
          onClick={() =>
            setViewingPatient(
              null
            )
          }
        >

          <div
            className="teleconsult-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="teleconsult-modal-header">

              <div>
                <h2>
                  Patient Details
                </h2>

                <p>
                  Read-only Teleconsult information
                </p>
              </div>

              <button
                type="button"
                className="teleconsult-modal-close"
                onClick={() =>
                  setViewingPatient(
                    null
                  )
                }
              >
                ✕
              </button>

            </div>

            <div className="teleconsult-modal-body">

              <div className="teleconsult-detail-grid">

                <div>
                  <label>
                    Company
                  </label>

                  <strong>
                    {
                      viewingPatient.company ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <label>
                    No.
                  </label>

                  <strong>
                    {
                      viewingPatient.no ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <label>
                    PhilHealth No.
                  </label>

                  <strong>
                    {
                      viewingPatient.philHealthNo ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <label>
                    Last Name
                  </label>

                  <strong>
                    {
                      viewingPatient.lastName ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <label>
                    First Name
                  </label>

                  <strong>
                    {
                      viewingPatient.firstName ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <label>
                    Middle Name
                  </label>

                  <strong>
                    {
                      viewingPatient.middleName ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <label>
                    Date of Birth
                  </label>

                  <strong>
                    {formatDate(
                      viewingPatient.dateOfBirth
                    )}
                  </strong>
                </div>

                <div>
                  <label>
                    Age
                  </label>

                  <strong>
                    {
                      viewingPatient.age ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <label>
                    Contact No.
                  </label>

                  <strong>
                    {viewingPatient.contactNo
                      ? `+63 ${viewingPatient.contactNo}`
                      : "—"}
                  </strong>
                </div>

                <div className="teleconsult-detail-full">
                  <label>
                    Address
                  </label>

                  <strong>
                    {
                      viewingPatient.address ||
                      "—"
                    }
                  </strong>
                </div>

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
                    Status
                  </label>

                  <strong>
                    {
                      viewingPatient.status ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <label>
                    Medicine Delivery
                  </label>

                  <strong>
                    {
                      viewingPatient.medicineDelivery ||
                      "No"
                    }
                  </strong>
                </div>

                <div className="teleconsult-detail-full">
                  <label>
                    Remarks
                  </label>

                  <strong>
                    {
                      viewingPatient.remarks ||
                      "—"
                    }
                  </strong>
                </div>

              </div>

              <div className="teleconsult-section">

                <div className="teleconsult-section-header">
                  <h3>
                    📦 Monthly Deliveries
                  </h3>
                </div>

                {viewingPatient
                  .monthlyDeliveries
                  ?.length ? (
                  <div className="teleconsult-delivery-list">

                    {viewingPatient.monthlyDeliveries.map(
                      (
                        delivery
                      ) => (
                        <div
                          className="teleconsult-delivery-card"
                          key={
                            delivery.id
                          }
                        >

                          <div>
                            <span>
                              {
                                delivery.month
                              }
                            </span>

                            <strong>
                              {formatDate(
                                delivery.scheduledDate
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Status
                            </span>

                            <strong>
                              {
                                delivery.status
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Actual Delivery
                            </span>

                            <strong>
                              {formatDate(
                                delivery.date
                              )}
                            </strong>
                          </div>

                        </div>
                      )
                    )}

                  </div>
                ) : (
                  <p className="teleconsult-muted">
                    No monthly delivery schedule.
                  </p>
                )}

              </div>

              <div className="teleconsult-section">

                <div className="teleconsult-section-header">
                  <h3>
                    💊 Medicines
                  </h3>
                </div>

                {medicineMonths.map(
                  (month) => {
                    const medicines =
                      viewingPatient
                        .medicinesByMonth?.[
                        month
                      ] || [];

                    return (
                      <div
                        className="teleconsult-view-month"
                        key={month}
                      >

                        <h4>
                          {month}
                        </h4>

                        {medicines.length ? (
                          <div className="teleconsult-medicine-list">

                            {medicines.map(
                              (
                                medicine
                              ) => (
                                <div
                                  className="teleconsult-medicine-row"
                                  key={
                                    medicine.id
                                  }
                                >

                                  <span>
                                    {
                                      medicine.medicine
                                    }
                                  </span>

                                  <strong>
                                    Qty:{" "}
                                    {
                                      medicine.quantity
                                    }
                                  </strong>

                                </div>
                              )
                            )}

                          </div>
                        ) : (
                          <p className="teleconsult-muted">
                            No medicines prescribed for this month.
                          </p>
                        )}

                      </div>
                    );
                  }
                )}

              </div>

            </div>

            <div className="teleconsult-modal-footer">

              <button
                type="button"
                className="teleconsult-cancel-btn"
                onClick={() =>
                  setViewingPatient(
                    null
                  )
                }
              >
                Close
              </button>

              <button
                type="button"
                className="teleconsult-edit-primary-btn"
                onClick={() => {
                  const patient =
                    viewingPatient;

                  setViewingPatient(
                    null
                  );

                  handleEditPatient(
                    patient
                  );
                }}
              >
                ✎ Edit
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ===================================================
          EDIT MODAL
      =================================================== */}

      {showPatientModal && (
        <div
          className="teleconsult-modal-overlay"
          onClick={
            handleClosePatientModal
          }
        >

          <div
            className="teleconsult-modal teleconsult-edit-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="teleconsult-modal-header">

              <div>
                <h2>
                  Edit Teleconsult Patient
                </h2>

                <p>
                  Update teleconsult, delivery, and medicine information.
                </p>
              </div>

              <button
                type="button"
                className="teleconsult-modal-close"
                onClick={
                  handleClosePatientModal
                }
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={
                handleSavePatient
              }
            >

              <div className="teleconsult-modal-body">

                <div className="teleconsult-section">

                  <div className="teleconsult-section-header">
                    <h3>
                      👤 Patient Information
                    </h3>
                  </div>

                  <div className="teleconsult-form-grid">

                    <div className="teleconsult-field">

                      <label>
                        Company
                      </label>

                      <div className="teleconsult-company-edit-row">

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

                          {companies.map(
                            (
                              company
                            ) => (
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

                        <button
                          type="button"
                          className="teleconsult-inline-add-company-btn"
                          title="Add Company"
                          onClick={
                            handleOpenCompanyModal
                          }
                        >
                          ＋
                        </button>

                      </div>

                    </div>

                    <div className="teleconsult-field">
                      <label>
                        No.
                      </label>

                      <input
                        value={
                          newPatient.no
                        }
                        readOnly
                      />
                    </div>

                    <div className="teleconsult-field">
                      <label>
                        PhilHealth No.
                      </label>

                      <input
                        value={
                          newPatient.philHealthNo
                        }
                        readOnly
                      />
                    </div>

                    <div className="teleconsult-field">
                      <label>
                        Last Name
                      </label>

                      <input
                        value={
                          newPatient.lastName
                        }
                        readOnly
                      />
                    </div>

                    <div className="teleconsult-field">
                      <label>
                        First Name
                      </label>

                      <input
                        value={
                          newPatient.firstName
                        }
                        readOnly
                      />
                    </div>

                    <div className="teleconsult-field">
                      <label>
                        Middle Name
                      </label>

                      <input
                        value={
                          newPatient.middleName
                        }
                        readOnly
                      />
                    </div>

                    <div className="teleconsult-field">
                      <label>
                        Date of Birth
                      </label>

                      <input
                        value={formatDate(
                          newPatient.dateOfBirth
                        )}
                        readOnly
                      />
                    </div>

                    <div className="teleconsult-field">
                      <label>
                        Age
                      </label>

                      <input
                        value={
                          newPatient.age
                        }
                        readOnly
                      />
                    </div>

                    <div className="teleconsult-field">
                      <label>
                        Contact No.
                      </label>

                      <div className="teleconsult-contact-input">

                        <span>
                          +63
                        </span>

                        <input
                          type="text"
                          value={
                            newPatient.contactNo
                          }
                          onChange={
                            handleContactNumberChange
                          }
                          placeholder="9XXXXXXXXX"
                          maxLength="10"
                        />

                      </div>
                    </div>

                    <div className="teleconsult-field teleconsult-field-full">

                      <label>
                        Address
                      </label>

                      <input
                        value={
                          newPatient.address
                        }
                        readOnly
                      />

                    </div>

                  </div>

                </div>

                <div className="teleconsult-section">

                  <div className="teleconsult-section-header">
                    <h3>
                      📞 Teleconsult Information
                    </h3>
                  </div>

                  <div className="teleconsult-form-grid">

                    <div className="teleconsult-field">

                      <label>
                        Date of Call
                      </label>

                      <input
                        type="date"
                        name="dateOfCall"
                        value={
                          newPatient.dateOfCall
                        }
                        onChange={
                          handleInputChange
                        }
                      />

                    </div>

                    <div className="teleconsult-field">

                      <label>
                        Schedule Next Teleconsult
                      </label>

                      <input
                        type="date"
                        name="nextTeleconsult"
                        value={
                          newPatient.nextTeleconsult
                        }
                        onChange={
                          handleInputChange
                        }
                      />

                    </div>

                    <div className="teleconsult-field">

                      <label>
                        Status
                      </label>

                      <select
                        name="status"
                        value={
                          newPatient.status
                        }
                        onChange={
                          handleInputChange
                        }
                      >
                        {TELECONSULT_STATUSES.map(
                          (
                            status
                          ) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {
                                status
                              }
                            </option>
                          )
                        )}
                      </select>

                    </div>

                    <div className="teleconsult-field">

                      <label>
                        Endorsed to Medicine Delivery
                      </label>

                      <select
                        name="medicineDelivery"
                        value={
                          newPatient.medicineDelivery
                        }
                        onChange={
                          handleInputChange
                        }
                      >
                        <option value="No">
                          No
                        </option>

                        <option value="Yes">
                          Yes
                        </option>
                      </select>

                    </div>

                    <div className="teleconsult-field teleconsult-field-full">

                      <label>
                        Remarks
                      </label>

                      <textarea
                        name="remarks"
                        value={
                          newPatient.remarks
                        }
                        onChange={
                          handleInputChange
                        }
                        rows="3"
                        placeholder="Enter remarks..."
                      />

                    </div>

                  </div>

                </div>

                <div className="teleconsult-section">

                  <div className="teleconsult-section-header">

                    <div>
                      <h3>
                        📦 Monthly Delivery Schedule
                      </h3>

                      <p>
                        Month 1 controls the initial schedule. Later months are automatically generated.
                      </p>
                    </div>

                  </div>

                  {newPatient.medicineDelivery ===
                  "Yes" ? (
                    <div className="teleconsult-delivery-edit-list">

                      {newPatient.monthlyDeliveries.map(
                        (
                          delivery,
                          index
                        ) => (
                          <div
                            className="teleconsult-delivery-edit-card"
                            key={
                              delivery.id
                            }
                          >

                            <div className="teleconsult-delivery-month-title">

                              <span>
                                {
                                  delivery.month
                                }
                              </span>

                              {index ===
                                0 && (
                                <small>
                                  Month 1
                                </small>
                              )}

                            </div>

                            <div className="teleconsult-form-grid">

                              <div className="teleconsult-field">

                                <label>
                                  Scheduled Date
                                </label>

                                <input
                                  type="date"
                                  value={
                                    delivery.scheduledDate ||
                                    ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateMonthlyDelivery(
                                      delivery.id,
                                      "scheduledDate",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                />

                                {index ===
                                  0 && (
                                  <small className="teleconsult-help">
                                    Changing Month 1 automatically updates the other months.
                                  </small>
                                )}

                              </div>

                              <div className="teleconsult-field">

                                <label>
                                  Status
                                </label>

                                <select
                                  value={
                                    delivery.status ||
                                    "Pending"
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateMonthlyDelivery(
                                      delivery.id,
                                      "status",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                >
                                  {DELIVERY_STATUSES.map(
                                    (
                                      status
                                    ) => (
                                      <option
                                        key={
                                          status
                                        }
                                        value={
                                          status
                                        }
                                      >
                                        {
                                          status
                                        }
                                      </option>
                                    )
                                  )}
                                </select>

                              </div>

                              <div className="teleconsult-field">

                                <label>
                                  Actual Delivery Date
                                </label>

                                <input
                                  type="date"
                                  value={
                                    delivery.date ||
                                    ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateMonthlyDelivery(
                                      delivery.id,
                                      "date",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                />

                              </div>

                            </div>

                          </div>
                        )
                      )}

                      {!newPatient
                        .monthlyDeliveries
                        .length && (
                        <div className="teleconsult-empty-delivery">

                          <strong>
                            No delivery schedule yet.
                          </strong>

                          <p>
                            Add medicines and save with Medicine Delivery = Yes to create the schedule.
                          </p>

                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="teleconsult-disabled-box">
                      Medicine Delivery is currently disabled.
                      Set "Endorsed to Medicine Delivery" to Yes to create a delivery schedule.
                    </div>
                  )}

                </div>

                <div className="teleconsult-section">

                  <div className="teleconsult-section-header">

                    <div>
                      <h3>
                        💊 Medicines by Month
                      </h3>

                      <p>
                        Add prescribed medicines for each delivery month.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="teleconsult-add-month-btn"
                      onClick={
                        handleAddMedicineMonth
                      }
                    >
                      ＋ Add Month
                    </button>

                  </div>

                  <div className="teleconsult-month-tabs">

                    {medicineMonths.map(
                      (
                        month
                      ) => (
                        <button
                          type="button"
                          key={
                            month
                          }
                          className={
                            activeMedicineMonth ===
                            month
                              ? "active"
                              : ""
                          }
                          onClick={() => {
                            setActiveMedicineMonth(
                              month
                            );

                            resetMedicineForm();
                          }}
                        >
                          {
                            month
                          }

                          <span>
                            {
                              getMonthMedicineCount(
                                newPatient.medicinesByMonth,
                                month
                              )
                            }
                          </span>

                        </button>
                      )
                    )}

                  </div>

                  {activeMedicineMonth && (
                    <div className="teleconsult-medicine-editor">

                      <h4>
                        {
                          activeMedicineMonth
                        }
                      </h4>

                      <div className="teleconsult-medicine-add-row">

                        <div className="teleconsult-medicine-search">

                          <label>
                            Medicine
                          </label>

                          <input
                            type="text"
                            value={
                              medicineSearch
                            }
                            placeholder="Search medicine..."
                            onFocus={() =>
                              setShowMedicineDropdown(
                                true
                              )
                            }
                            onChange={(
                              event
                            ) => {
                              setMedicineSearch(
                                event
                                  .target
                                  .value
                              );

                              setSelectedMedicine(
                                ""
                              );

                              setShowMedicineDropdown(
                                true
                              );
                            }}
                          />

                          {showMedicineDropdown && (
                            <div className="teleconsult-medicine-dropdown">

                              {filteredMedicines.length >
                              0 ? (
                                filteredMedicines.map(
                                  (
                                    medicine
                                  ) => (
                                    <button
                                      type="button"
                                      key={
                                        medicine
                                      }
                                      onClick={() =>
                                        handleSelectMedicine(
                                          medicine
                                        )
                                      }
                                    >
                                      {
                                        medicine
                                      }
                                    </button>
                                  )
                                )
                              ) : (
                                <div className="teleconsult-no-medicine">
                                  No medicine found.
                                </div>
                              )}

                            </div>
                          )}

                        </div>

                        <div className="teleconsult-qty-field">

                          <label>
                            Quantity
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={
                              medicineQty
                            }
                            onChange={(
                              event
                            ) =>
                              setMedicineQty(
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                        </div>

                        <button
                          type="button"
                          className="teleconsult-add-medicine-btn"
                          onClick={() =>
                            handleAddMedicine(
                              activeMedicineMonth
                            )
                          }
                        >
                          ＋ Add Medicine
                        </button>

                      </div>

                      <div className="teleconsult-current-medicine-list">

                        {currentMonthMedicines.length >
                        0 ? (
                          currentMonthMedicines.map(
                            (
                              medicine
                            ) => (
                              <div
                                className="teleconsult-current-medicine"
                                key={
                                  medicine.id
                                }
                              >

                                <div>

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

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveMedicine(
                                      activeMedicineMonth,
                                      medicine.id
                                    )
                                  }
                                >
                                  🗑
                                </button>

                              </div>
                            )
                          )
                        ) : (
                          <div className="teleconsult-no-current-medicine">
                            No medicines added for{" "}
                            {
                              activeMedicineMonth
                            }.
                          </div>
                        )}

                      </div>

                    </div>
                  )}

                </div>

              </div>

              <div className="teleconsult-modal-footer">

                <button
                  type="button"
                  className="teleconsult-cancel-btn"
                  onClick={
                    handleClosePatientModal
                  }
                  disabled={
                    isSaving
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="teleconsult-save-btn"
                  disabled={
                    isSaving
                  }
                >
                  {isSaving
                    ? "💾 Saving..."
                    : "💾 Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Teleconsult;