import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import auth from "./firebase/auth";
import db from "./firebase/firestore";

import IcareRegistration from "./IcareRegistration";
import Teleconsult from "./Teleconsult";
import MedicineDelivery from "./MedicineDelivery";
import SuccessfulDelivery from "./SuccessfulDelivery";
import CancelledDelivery from "./CancelledDelivery";
import AuditHistory from "./AuditHistory";
import DeletedRecords from "./DeletedRecords";

import "./App.css";
import "./Login.css";

const ALLOWED_EMAILS = [
  "cjaycastro@gmail.com",
  "jmbandol@1life.ph",
  "rmvalderama@1life.ph",
  "1lifejayvee@gmail.com",
].map((email) => email.toLowerCase());

const API_URL = "http://localhost:5000";


const Icon = ({ name, size = 20, strokeWidth = 1.9 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "pro-icon-svg",
    "aria-hidden": "true",
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );

    case "registration":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 7h6M9 11h6M9 15h3" />
          <circle cx="16.5" cy="16.5" r="2.2" />
          <path d="M14.8 19c.5-.9 1.1-1.4 1.7-1.4s1.2.5 1.7 1.4" />
        </svg>
      );

    case "teleconsult":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9.7 9.7 0 0 1-4-.9L3 21l1.9-4.1A8.2 8.2 0 0 1 3 12a8.5 8.5 0 0 1 9-8.5 8.5 8.5 0 0 1 9 8Z" />
          <path d="M8 11.5h8M8 8.5h5M8 14.5h4" />
        </svg>
      );

    case "medicine":
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M9 3.5v4h6v-4M9 13h6M12 10v6" />
        </svg>
      );

    case "reports":
      return (
        <svg {...common}>
          <path d="M5 3h10l4 4v14H5z" />
          <path d="M15 3v5h4M8 17v-4M12 17v-7M16 17v-3" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4v-3h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3.5 20c.4-3.2 2.2-5 5.5-5s5.1 1.8 5.5 5M14 15.5c2.8-.2 4.7 1.2 5.2 4.5" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 5H5v14h5" />
          <path d="M13 8l4 4-4 4M17 12H9" />
        </svg>
      );

    case "employees":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3.5 20c.4-3.2 2.2-5 5.5-5s5.1 1.8 5.5 5M14 15.5c2.8-.2 4.7 1.2 5.2 4.5" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12.5 4 4L19 7" />
        </svg>
      );

    case "x":
      return (
        <svg {...common}>
          <path d="m7 7 10 10M17 7 7 17" />
        </svg>
      );

    case "warning":
      return (
        <svg {...common}>
          <path d="m12 3 9 17H3L12 3Z" />
          <path d="M12 9v4M12 16h.01" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "package":
      return (
        <svg {...common}>
          <path d="m4 7 8-4 8 4-8 4-8-4Z" />
          <path d="M4 7v10l8 4 8-4V7M12 11v10" />
        </svg>
      );

    case "truck":
      return (
        <svg {...common}>
          <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13M13 7l5 5-5 5" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.6-4 2.8-6 7-6s6.4 2 7 6" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m7 9 5 5 5-5" />
        </svg>
      );

    case "email":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </svg>
      );

    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          <path d="M12 14v2" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </svg>
      );

    default:
      return null;
  }
};


function App() {

  // =========================================================
  // LOGIN
  // =========================================================

  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);


  // =========================================================
  // ICARE DATA
  // MYSQL IS NOW THE MAIN DATABASE
  // =========================================================

  const [firebaseIcareData, setFirebaseIcareData] =
    useState([]);


  // =========================================================
  // FIRESTORE TELECONSULT DATA
  // =========================================================

  const [teleconsultData, setTeleconsultData] =
    useState({});


  // =========================================================
  // DASHBOARD
  // =========================================================

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [activeMenu, setActiveMenu] =
    useState("Dashboard");


  // =========================================================
  // SIDEBAR
  // =========================================================

  const [sidebarOpen, setSidebarOpen] =
    useState(true);


  // =========================================================
  // AUTH SESSION
  // =========================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          setUser(currentUser);
          setAuthLoading(false);

        }
      );

    return () => unsubscribe();

  }, []);


  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (e) => {

    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      setPassword("");

    } catch (err) {

      console.error(
        "Login error:",
        err
      );

      setError(
        "Invalid email or password."
      );

    } finally {

      setLoading(false);

    }

  };


  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {

    try {

      await signOut(auth);

      setUser(null);
      setEmail("");
      setPassword("");

      setFirebaseIcareData([]);
      setTeleconsultData({});

      setActiveMenu("Dashboard");

    } catch (err) {

      console.error(
        "Logout error:",
        err
      );

    }

  };


  // =========================================================
  // LOAD ICARE PATIENTS FROM MYSQL
  // MYSQL = MAIN DATABASE
  // =========================================================

  useEffect(() => {

    if (!user) {

      setFirebaseIcareData([]);

      return;

    }


    let cancelled = false;


    const loadIcarePatientsFromMySQL =
      async () => {

        try {

          const response =
            await fetch(
              `${API_URL}/api/patients`
            );


          if (!response.ok) {

            throw new Error(
              `HTTP ${response.status}`
            );

          }


          const result =
            await response.json();


          if (
            !result?.success
          ) {

            throw new Error(
              result?.message ||
              "Unable to load ICARE patients from MySQL."
            );

          }


          const patients =
            Array.isArray(
              result.data
            )
              ? result.data
              : [];


          if (!cancelled) {

            console.log(
              "ICARE PATIENTS FROM MYSQL:",
              patients
            );


            setFirebaseIcareData(
              patients
            );

          }

        } catch (mysqlError) {

          console.error(
            "Unable to load ICARE patients from MySQL:",
            mysqlError
          );


          if (!cancelled) {

            setFirebaseIcareData(
              []
            );

          }

        }

      };


    // ---------------------------------------------------------
    // INITIAL LOAD
    // ---------------------------------------------------------

    loadIcarePatientsFromMySQL();


    // ---------------------------------------------------------
    // AUTOMATIC REFRESH
    // ---------------------------------------------------------
    // This allows Dashboard to recognize:
    // - newly added patients
    // - edited patients
    // - deleted patients
    // - batch uploaded patients
    //
    // without changing the existing Dashboard UI.
    // ---------------------------------------------------------

    const refreshInterval =
      setInterval(
        () => {

          loadIcarePatientsFromMySQL();

        },
        3000
      );


    return () => {

      cancelled = true;

      clearInterval(
        refreshInterval
      );

    };

  }, [user]);


  // =========================================================
  // LOAD TELECONSULT FROM FIRESTORE
  // =========================================================

  useEffect(() => {

    if (!user) {

      setTeleconsultData({});

      return;

    }


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

              data[docSnapshot.id] = {

                id:
                  docSnapshot.id,

                ...docSnapshot.data(),

              };

            }
          );


          console.log(
            "TELECONSULT DATA FROM FIRESTORE:",
            data
          );


          setTeleconsultData(
            data
          );

        },


        (firebaseError) => {

          console.error(
            "Unable to load Teleconsult data from Firestore:",
            firebaseError
          );


          setTeleconsultData({});

        }

      );


    return () =>
      unsubscribe();

  }, [user]);


  // =========================================================
  // HELPERS
  // =========================================================

  const getValue = (
    record,
    field
  ) => {

    if (!record) return "";

    return (
      record?.[field] ??
      ""
    );

  };


  const cleanString = (
    value
  ) => {

    return String(
      value ?? ""
    )
      .trim();

  };


  const normalizeValue = (
    value
  ) => {

    return cleanString(
      value
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      );

  };


  const normalizeId = (
    value
  ) => {

    return cleanString(
      value
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  };


  // =========================================================
  // GET ICARE VALUE
  // =========================================================

  const getIcareValue = (
    record,
    key
  ) => {

    if (!record) return "";


    if (
      record[key] !== undefined &&
      record[key] !== null
    ) {

      return record[key];

    }


    const capitalizedKey =
      key.charAt(0).toUpperCase() +
      key.slice(1);


    if (
      record[capitalizedKey] !== undefined &&
      record[capitalizedKey] !== null
    ) {

      return record[capitalizedKey];

    }


    return "";

  };


  // =========================================================
  // STABLE PATIENT ID
  // =========================================================

  const getPatientStableId = (
    patient
  ) => {

    const directId =
      patient?.id ??
      patient?.ID ??
      patient?.patientId ??
      patient?.patientID;


    if (
      directId !== undefined &&
      directId !== null &&
      cleanString(directId)
    ) {

      return cleanString(
        directId
      );

    }


    const philHealth =
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


    return normalizeId(
      [
        philHealth,
        lastName,
        firstName,
        middleName,
      ]
        .filter(Boolean)
        .join("-")
    );

  };


  // =========================================================
  // PATIENT IDENTIFIER CANDIDATES
  // =========================================================

  const getPatientIdentifierCandidates = (
    patient
  ) => {

    const candidates = [];


    const directId =
      patient?.id ??
      patient?.ID ??
      patient?.patientId ??
      patient?.patientID;


    if (
      directId !== undefined &&
      directId !== null
    ) {

      candidates.push(
        normalizeId(
          directId
        )
      );

    }


    const philHealth =
      getIcareValue(
        patient,
        "philhealthNo"
      ) ||
      getIcareValue(
        patient,
        "philHealthNo"
      );


    if (philHealth) {

      candidates.push(
        normalizeId(
          philHealth
        )
      );

    }


    const stableId =
      getPatientStableId(
        patient
      );


    if (stableId) {

      candidates.push(
        normalizeId(
          stableId
        )
      );

    }


    return [
      ...new Set(
        candidates.filter(
          Boolean
        )
      ),
    ];

  };


  // =========================================================
  // FIND TELECONSULT RECORD
  // =========================================================

  const findTeleconsultExtra = (
    patient
  ) => {

    if (!patient) return null;


    const candidates =
      getPatientIdentifierCandidates(
        patient
      );


    // -------------------------------------------------------
    // DIRECT ID MATCH
    // -------------------------------------------------------

    for (
      const candidate of candidates
    ) {

      if (
        teleconsultData[candidate]
      ) {

        return (
          teleconsultData[candidate]
        );

      }


      const exactKey =
        Object.keys(
          teleconsultData
        ).find(
          (key) =>
            normalizeId(key) ===
            candidate
        );


      if (exactKey) {

        return (
          teleconsultData[exactKey]
        );

      }

    }


    // -------------------------------------------------------
    // PHILHEALTH FALLBACK
    // -------------------------------------------------------

    const patientPhilHealth =
      normalizeValue(
        getIcareValue(
          patient,
          "philhealthNo"
        ) ||
        getIcareValue(
          patient,
          "philHealthNo"
        )
      );


    if (patientPhilHealth) {

      const matched =
        Object.values(
          teleconsultData
        ).find(
          (extra) => {

            const extraPhilHealth =
              normalizeValue(
                extra?.philhealthNo ??
                extra?.philHealthNo ??
                ""
              );


            return (
              extraPhilHealth ===
              patientPhilHealth
            );

          }
        );


      if (matched) {

        return matched;

      }

    }


    // -------------------------------------------------------
    // NAME FALLBACK
    // -------------------------------------------------------

    const patientFirstName =
      normalizeValue(
        getIcareValue(
          patient,
          "firstName"
        )
      );


    const patientLastName =
      normalizeValue(
        getIcareValue(
          patient,
          "lastName"
        )
      );


    if (
      patientFirstName ||
      patientLastName
    ) {

      const matched =
        Object.values(
          teleconsultData
        ).find(
          (extra) => {

            const extraFirstName =
              normalizeValue(
                extra?.firstName ??
                ""
              );


            const extraLastName =
              normalizeValue(
                extra?.lastName ??
                ""
              );


            return (
              extraFirstName ===
                patientFirstName &&
              extraLastName ===
                patientLastName
            );

          }
        );


      if (matched) {

        return matched;

      }

    }


    return null;

  };


  // =========================================================
  // MEDICINE DELIVERY ENDORSEMENT
  // =========================================================

  const isMedicineDeliveryEndorsed = (
    extra
  ) => {

    if (!extra) return false;


    const primary =
      normalizeValue(
        extra.medicineDelivery
      );


    if (
      primary === "yes" ||
      primary === "true" ||
      primary === "1" ||
      primary === "endorsed" ||
      primary === "approved"
    ) {

      return true;

    }


    const alternateFields = [

      "endorseToMedicineDelivery",
      "endorseMedicineDelivery",
      "medicineDeliveryEndorsement",
      "endorsedToMedicineDelivery",
      "medicineDeliveryStatus",
      "deliveryEndorsement",
      "endorsement",
      "medicineDeliveryEndorsed",
      "endorseToDelivery",
      "isMedicineDelivery",
      "isMedicineDeliveryEndorsed",
      "medicineDeliveryEndorsedStatus",
      "medicineDeliveryReferral",
      "medicineDeliveryReferralStatus",

    ];


    for (
      const field of alternateFields
    ) {

      const value =
        normalizeValue(
          extra?.[field]
        );


      if (
        value === "yes" ||
        value === "true" ||
        value === "1" ||
        value === "endorsed" ||
        value === "approved" ||
        value === "yes - endorsed" ||
        value === "yes—endorsed" ||
        value === "yes — endorsed" ||
        value === "yes - endorse" ||
        value === "endorsed to medicine delivery" ||
        value === "medicine delivery" ||
        value === "medicine delivery endorsed"
      ) {

        return true;

      }


      if (
        value.includes("yes") &&
        value.includes("endorsed")
      ) {

        return true;

      }


      if (
        value.includes("endorsed") &&
        value.includes("medicine") &&
        value.includes("delivery")
      ) {

        return true;

      }

    }


    return false;

  };


  // =========================================================
  // FPE QUALIFICATION
  // =========================================================

  const isFpeQualified = (
    value
  ) => {

    const normalized =
      normalizeValue(
        value
      );


    if (!normalized) {

      return true;

    }


    return (
      normalized === "completed" ||
      normalized === "yes" ||
      normalized === "done"
    );

  };


  // =========================================================
  // GET DELIVERY SOURCE
  // =========================================================

  const getMonthlyDeliverySource = (
    extra
  ) => {

    if (!extra) {

      return {
        field: "monthlyDeliveries",
        deliveries: [],
      };

    }


    if (
      Array.isArray(
        extra.monthlyDeliveries
      )
    ) {

      return {
        field: "monthlyDeliveries",
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
        field: "subsequentDeliveries",
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
      field: "monthlyDeliveries",
      deliveries: [],
    };

  };


  // =========================================================
  // GET DELIVERY STATUS
  // =========================================================

  const getDeliveryStatus = (
    delivery
  ) => {

    return normalizeValue(
      delivery?.status
    );

  };


  // =========================================================
  // GET OVERALL DELIVERY STATUS
  // =========================================================

  const getOverallDeliveryStatus = (
    patient
  ) => {

    const deliveries =
      Array.isArray(
        patient?.monthlyDeliveries
      )
        ? patient.monthlyDeliveries
        : [];


    if (
      deliveries.length === 0
    ) {

      return "Pending";

    }


    const statuses =
      deliveries.map(
        getDeliveryStatus
      );


    const allDelivered =
      statuses.length > 0 &&
      statuses.every(
        (status) =>
          status === "delivered"
      );


    if (allDelivered) {

      return "Completed";

    }


    const allCancelled =
      statuses.length > 0 &&
      statuses.every(
        (status) =>
          status === "cancelled"
      );


    if (allCancelled) {

      return "Cancelled";

    }


    if (
      statuses.includes(
        "out for delivery"
      )
    ) {

      return "Out for Delivery";

    }


    if (
      statuses.includes(
        "preparing"
      )
    ) {

      return "Preparing";

    }


    return "Pending";

  };


  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (
    value
  ) => {

    if (!value) return "";


    if (
      value?.toDate
    ) {

      return value
        .toDate()
        .toLocaleDateString(
          "en-PH"
        );

    }


    if (
      value instanceof Date
    ) {

      return value
        .toLocaleDateString(
          "en-PH"
        );

    }


    const stringValue =
      String(value);


    if (
      /^\d{4}-\d{2}-\d{2}/.test(
        stringValue
      )
    ) {

      const parts =
        stringValue
          .slice(
            0,
            10
          )
          .split("-");


      return `${parts[1]}/${parts[2]}/${parts[0]}`;

    }


    return stringValue;

  };


  // =========================================================
  // COMBINED ICARE DATA
  // =========================================================

  const allIcareData =
    useMemo(() => {

      return firebaseIcareData;

    }, [
      firebaseIcareData,
    ]);


  // =========================================================
  // FILTERED ICARE DATA
  // =========================================================

  const filteredIcareData =
    useMemo(() => {

      const searchText =
        search
          .trim()
          .toLowerCase();


      return allIcareData.filter(
        (record) => {

          const philhealth =
            String(
              getValue(
                record,
                "philhealthNo"
              )
            ).toLowerCase();


          const lastName =
            String(
              getValue(
                record,
                "lastName"
              )
            ).toLowerCase();


          const firstName =
            String(
              getValue(
                record,
                "firstName"
              )
            ).toLowerCase();


          const status =
            String(
              getValue(
                record,
                "registrationStatus"
              )
            ).toUpperCase();


          const matchesSearch =
            searchText === "" ||
            philhealth.includes(
              searchText
            ) ||
            lastName.includes(
              searchText
            ) ||
            firstName.includes(
              searchText
            );


          const matchesStatus =
            statusFilter === "ALL" ||
            status ===
              statusFilter;


          return (
            matchesSearch &&
            matchesStatus
          );

        }
      );

    }, [
      allIcareData,
      search,
      statusFilter,
    ]);


  // =========================================================
  // COMPLETED ICARE RECORDS
  // =========================================================

  const completedRecords =
    useMemo(() => {

      return allIcareData.filter(
        (record) => {

          const status =
            String(
              getValue(
                record,
                "registrationStatus"
              )
            )
              .trim()
              .toUpperCase();


          return (
            status === "COMPLETED" ||
            status === "REGISTERED"
          );

        }
      );

    }, [
      allIcareData,
    ]);


  // =========================================================
  // TELECONSULT ENDORSED RECORDS
  // BASED ON ICARE FPE = COMPLETED
  // =========================================================

  const teleconsultEndorsedRecords =
    useMemo(() => {

      return allIcareData.filter(
        (record) => {

          const fpe =
            String(
              getIcareValue(
                record,
                "fpe"
              ) || ""
            )
              .trim()
              .toUpperCase();


          return fpe === "COMPLETED";

        }
      );

    }, [
      allIcareData,
    ]);


  // =========================================================
  // PENDING ICARE RECORDS
  // =========================================================

  const pendingRecords =
    useMemo(() => {

      return allIcareData.filter(
        (record) => {

          const status =
            String(
              getValue(
                record,
                "registrationStatus"
              )
            )
              .trim()
              .toUpperCase();


          return (
            status !== "COMPLETED" &&
            status !== "REGISTERED"
          );

        }
      );

    }, [
      allIcareData,
    ]);


  // =========================================================
  // DELIVERY PATIENTS
  // =========================================================

  const deliveryPatients =
    useMemo(() => {

      const result = [];


      allIcareData.forEach(
        (icarePatient) => {

          const fpe =
            getIcareValue(
              icarePatient,
              "fpe"
            );


          if (
            !isFpeQualified(
              fpe
            )
          ) {

            return;

          }


          const extra =
            findTeleconsultExtra(
              icarePatient
            );


          if (!extra) {

            return;

          }


          if (
            !isMedicineDeliveryEndorsed(
              extra
            )
          ) {

            return;

          }


          const {
            deliveries,
          } =
            getMonthlyDeliverySource(
              extra
            );


          const stableId =
            getPatientStableId(
              icarePatient
            );


          const mergedPatient = {

            ...icarePatient,

            ...extra,

            id:
              stableId ||
              icarePatient.id,

            monthlyDeliveries:
              Array.isArray(
                extra.monthlyDeliveries
              )
                ? extra.monthlyDeliveries
                : Array.isArray(
                    extra.subsequentDeliveries
                  )
                  ? extra.subsequentDeliveries
                  : Array.isArray(
                      extra.deliveries
                    )
                    ? extra.deliveries
                    : [],

            medicineDelivery:
              "Yes",

          };


          if (
            mergedPatient.monthlyDeliveries
              .length === 0 &&
            deliveries.length > 0
          ) {

            mergedPatient.monthlyDeliveries =
              deliveries;

          }


          result.push(
            mergedPatient
          );

        }
      );


      const unique =
        new Map();


      result.forEach(
        (patient) => {

          const key =
            normalizeId(
              getPatientStableId(
                patient
              )
            );


          if (
            key &&
            !unique.has(key)
          ) {

            unique.set(
              key,
              patient
            );

          }

        }
      );


      return Array.from(
        unique.values()
      );

    }, [
      allIcareData,
      teleconsultData,
    ]);


  // =========================================================
  // SUCCESSFUL DELIVERY RECORDS
  // =========================================================

  const successfulDeliveryRecords =
    useMemo(() => {

      const records = [];


      deliveryPatients.forEach(
        (patient) => {

          const deliveries =
            Array.isArray(
              patient.monthlyDeliveries
            )
              ? patient.monthlyDeliveries
              : [];


          deliveries.forEach(
            (delivery, index) => {

              const status =
                getDeliveryStatus(
                  delivery
                );


              if (
                status === "delivered"
              ) {

                records.push({

                  patient,

                  delivery,

                  index,

                });

              }

            }
          );

        }
      );


      return records;

    }, [
      deliveryPatients,
    ]);


  // =========================================================
  // CANCELLED DELIVERY RECORDS
  // =========================================================

  const cancelledDeliveryRecords =
    useMemo(() => {

      const records = [];


      deliveryPatients.forEach(
        (patient) => {

          const deliveries =
            Array.isArray(
              patient.monthlyDeliveries
            )
              ? patient.monthlyDeliveries
              : [];


          deliveries.forEach(
            (delivery, index) => {

              const status =
                getDeliveryStatus(
                  delivery
                );


              if (
                status === "cancelled"
              ) {

                records.push({

                  patient,

                  delivery,

                  index,

                });

              }

            }
          );

        }
      );


      return records;

    }, [
      deliveryPatients,
    ]);


  // =========================================================
  // UNIQUE SUCCESSFUL DELIVERY PATIENTS
  // =========================================================

  const successfulDeliveryPatients =
    useMemo(() => {

      const seen = new Set();


      return successfulDeliveryRecords
        .map(
          (record) =>
            record.patient
        )
        .filter(
          (patient) => {

            const key =
              patient?.id ??
              patient?.philhealthNo ??
              patient?.philHealthNo ??
              patient?.patientName;


            if (
              !key ||
              seen.has(
                String(key)
              )
            ) {

              return false;

            }


            seen.add(
              String(key)
            );


            return true;

          }
        );

    }, [
      successfulDeliveryRecords,
    ]);


  // =========================================================
  // UNIQUE CANCELLED DELIVERY PATIENTS
  // =========================================================

  const cancelledDeliveryPatients =
    useMemo(() => {

      const seen = new Set();


      return cancelledDeliveryRecords
        .map(
          (record) =>
            record.patient
        )
        .filter(
          (patient) => {

            const key =
              patient?.id ??
              patient?.philhealthNo ??
              patient?.philHealthNo ??
              patient?.patientName;


            if (
              !key ||
              seen.has(
                String(key)
              )
            ) {

              return false;

            }


            seen.add(
              String(key)
            );


            return true;

          }
        );

    }, [
      cancelledDeliveryRecords,
    ]);


  // =========================================================
  // DELIVERY COUNTS
  // =========================================================

  const medicineDeliveryCount =
    deliveryPatients.length;


  const successfulDeliveryCount =
    successfulDeliveryPatients.length;


  const cancelledDeliveryCount =
    cancelledDeliveryPatients.length;


  // =========================================================
  // DASHBOARD SUMMARY
  // =========================================================

  const totalEmployees =
    allIcareData.length;


  const totalRegistered =
    allIcareData.filter(
      (record) => {

        const status =
          String(
            getValue(
              record,
              "registrationStatus"
            )
          )
            .trim()
            .toUpperCase();


        return (
          status === "REGISTERED" ||
          status === "COMPLETED"
        );

      }
    ).length;


  const noPhilhealth =
    allIcareData.filter(
      (record) => {

        return (
          String(
            getValue(
              record,
              "philhealthNo"
            )
          ).trim() === ""
        );

      }
    ).length;


  const notRegistered =
    allIcareData.filter(
      (record) => {

        const status =
          String(
            getValue(
              record,
              "registrationStatus"
            )
          )
            .trim()
            .toUpperCase();


        return (
          status !== "REGISTERED" &&
          status !== "COMPLETED"
        );

      }
    ).length;


  // =========================================================
  // PROCEED TO TELECONSULT
  // =========================================================

  const handleProceedToTeleconsult = (
    record
  ) => {

    console.log(
      "Proceed to Teleconsult:",
      record
    );


    const fullName = [

      getValue(
        record,
        "firstName"
      ),

      getValue(
        record,
        "middleName"
      ),

      getValue(
        record,
        "lastName"
      ),

    ]
      .filter(Boolean)
      .join(" ");


    alert(
      `${fullName} is ready for Teleconsult.`
    );

  };


  // =========================================================
  // AUTH LOADING
  // =========================================================

  if (authLoading) {

    return null;

  }


  // =========================================================
  // LOGIN PAGE
  // =========================================================

  if (!user) {

    return (

      <div className="login-page">

        <div className="login-card">


          {/* LEFT SIDE */}

          <div className="login-left">

            <div className="login-logo-area">

              <img
                src="/Primary with tagline.png"
                alt="1Life"
                className="login-company-logo"
              />

            </div>


            <div className="yakap-brand">

              <div className="heartbeat-line">
                <span></span>
              </div>


              <h1>
                YAKAP
              </h1>


              <h2>
                MONITORING
              </h2>


              <div className="yakap-subtitle">

                YAKAP Registration &amp;
                <br />
                Medicine Delivery System

              </div>

            </div>


            <div className="login-features">


              <div className="login-feature-card">

                <div className="feature-icon">
                  <Icon
                    name="registration"
                    size={24}
                  />
                </div>

                <strong>
                  REGISTRATION
                </strong>

                <p>
                  Register and manage
                  <br />
                  patient information
                </p>

              </div>


              <div className="login-feature-card">

                <div className="feature-icon">
                  <Icon
                    name="teleconsult"
                    size={24}
                  />
                </div>

                <strong>
                  TELECONSULT
                </strong>

                <p>
                  Connect with doctors
                  <br />
                  through teleconsultation
                </p>

              </div>


              <div className="login-feature-card">

                <div className="feature-icon">
                  <Icon
                    name="medicine"
                    size={24}
                  />
                </div>

                <strong>
                  MEDICINE DELIVERY
                </strong>

                <p>
                  Safe and reliable
                  <br />
                  medicine delivery
                </p>

              </div>


            </div>


            <div className="care-message">

              <span>
                We care. We monitor. We deliver.
              </span>

            </div>

          </div>


          {/* RIGHT SIDE */}

          <div className="login-right">

            <div className="login-form-container">


              <div className="login-welcome">

                <h2>
                  Welcome Back!
                </h2>

                <div className="welcome-line"></div>

                <p>
                  Please login to continue
                </p>

              </div>


              <form
                onSubmit={
                  handleLogin
                }
              >


                {/* EMAIL */}

                <div className="form-group">

                  <label htmlFor="email">
                    Email
                  </label>


                  <div className="input-wrapper">

                    <span className="input-icon">
                      <Icon
                        name="email"
                        size={18}
                      />
                    </span>


                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      required
                    />

                  </div>

                </div>


                {/* PASSWORD */}

                <div className="form-group">

                  <label htmlFor="password">
                    Password
                  </label>


                  <div className="input-wrapper">

                    <span className="input-icon">
                      <Icon
                        name="lock"
                        size={18}
                      />
                    </span>


                    <input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      required
                    />


                    <span className="password-eye">
                      <Icon
                        name="user"
                        size={17}
                      />
                    </span>

                  </div>

                </div>


                <div className="forgot-password">
                  Forgot your password?
                </div>


                {error && (

                  <div className="login-error">
                    {error}
                  </div>

                )}


                <button
                  type="submit"
                  className="login-button"
                  disabled={
                    loading
                  }
                >

                  <span className="login-lock">
                    <Icon
                      name="lock"
                      size={17}
                    />
                  </span>


                  {loading
                    ? "SIGNING IN..."
                    : "LOGIN"}

                </button>

              </form>


              <div className="login-or">

                <span></span>

                <strong>
                  OR
                </strong>

                <span></span>

              </div>


              <div className="secure-login">

                <div className="secure-icon">
                  ✓
                </div>


                <div>

                  <strong>
                    Secure Login
                  </strong>

                  <p>
                    Your information is protected
                  </p>

                </div>

              </div>


            </div>

          </div>


        </div>


        <div className="login-footer">

          © 2026{" "}

          <strong>
            1Life Healthcare, Inc.
          </strong>

          {" "}All rights reserved.

        </div>


      </div>

    );

  }


  // =========================================================
  // MAIN APP
  // =========================================================

  return (

    <div
      className={`dashboard-layout ${
        sidebarOpen
          ? "sidebar-open"
          : "sidebar-hidden"
      }`}
    >


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`sidebar ${
          sidebarOpen
            ? ""
            : "sidebar-hidden"
        }`}
      >


        <div className="sidebar-logo">

          <img
            src="/Primary with tagline.png"
            alt="1Life"
          />

        </div>


        <nav className="sidebar-nav">


          <button
            className={`nav-item ${
              activeMenu ===
              "Dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveMenu(
                "Dashboard"
              )
            }
          >

            <span className="nav-icon">
              <Icon name="home" />
            </span>

            Dashboard

          </button>


          <button
            className={`nav-item ${
              activeMenu ===
              "ICARE"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveMenu(
                "ICARE"
              )
            }
          >

            <span className="nav-icon">
              <Icon name="registration" />
            </span>

            YAKAP REGISTRATION

          </button>


          <button
            className={`nav-item ${
              activeMenu ===
              "Teleconsult"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveMenu(
                "Teleconsult"
              )
            }
          >

            <span className="nav-icon">
              <Icon name="teleconsult" />
            </span>

            TELECONSULT

          </button>


          <button
            className={`nav-item ${
              activeMenu ===
              "Medicine"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveMenu(
                "Medicine"
              )
            }
          >

            <span className="nav-icon">
              <Icon name="medicine" />
            </span>

            MEDICINE DELIVERY

          </button>


          <div className="nav-section-title">
            DELIVERY HISTORY
          </div>


          <button
            className={`nav-subitem ${
              activeMenu ===
              "Successful"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveMenu(
                "Successful"
              )
            }
          >

            <span className="success-dot">
              <Icon
                name="check"
                size={15}
              />
            </span>

            Successful Delivery

          </button>


          <button
            className={`nav-subitem ${
              activeMenu ===
              "Cancelled"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveMenu(
                "Cancelled"
              )
            }
          >

            <span className="cancel-dot">
              <Icon
                name="x"
                size={15}
              />
            </span>

            Cancelled Delivery

          </button>


          {/* =====================================================
              AUDIT HISTORY
          ===================================================== */}

          <button
            className={`nav-item ${
              activeMenu ===
              "AuditHistory"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveMenu(
                "AuditHistory"
              )
            }
          >

            <span className="nav-icon">
              <Icon name="shield" />
            </span>

            Audit History

          </button>


          {/* =====================================================
              DELETED RECORDS
          ===================================================== */}

          <button
            className={`nav-item ${
              activeMenu ===
              "DeletedRecords"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveMenu(
                "DeletedRecords"
              )
            }
          >

            <span className="nav-icon">
              <Icon name="reports" />
            </span>

            Deleted Records

          </button>


          <button className="nav-item">

            <span className="nav-icon">
              <Icon name="settings" />
            </span>

            Settings

          </button>


          <button className="nav-item">

            <span className="nav-icon">
              <Icon name="users" />
            </span>

            Users

          </button>


          <button
            className="nav-item"
            onClick={
              handleLogout
            }
          >

            <span className="nav-icon">
              <Icon name="logout" />
            </span>

            Logout

          </button>


        </nav>


        <div className="sidebar-care">

          <div className="care-icon">
            <Icon
              name="check"
              size={22}
            />
          </div>

          <strong>
            We care.
          </strong>

          <strong>
            We monitor.
          </strong>

          <strong>
            We deliver.
          </strong>

        </div>


      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="main-content">


        {/* TOPBAR */}

        <header className="dashboard-topbar">


          <div className="dashboard-title-area">

            <button
              type="button"
              className="sidebar-toggle"
              onClick={() =>
                setSidebarOpen(
                  (previous) =>
                    !previous
                )
              }
              aria-label={
                sidebarOpen
                  ? "Hide sidebar"
                  : "Show sidebar"
              }
              title={
                sidebarOpen
                  ? "Hide Sidebar"
                  : "Show Sidebar"
              }
            >
              <Icon
                name="menu"
                size={21}
              />
            </button>


            <span>
              Dashboard
            </span>

          </div>


          <div className="dashboard-user">


            <span className="dashboard-date">

              {new Date()
                .toLocaleDateString(
                  "en-PH",
                  {
                    year:
                      "numeric",
                    month:
                      "long",
                    day:
                      "numeric",
                  }
                )}

            </span>


            <div className="user-divider"></div>


            <div className="user-avatar">
              <Icon
                name="user"
                size={18}
              />
            </div>


            <div className="user-info">

              <strong>
                {user.email}
              </strong>

              <small>
                Administrator
              </small>

            </div>


            <div className="user-dropdown">


              <button
                type="button"
                className="user-dropdown-toggle"
                onClick={() =>
                  setActiveMenu(
                    activeMenu ===
                      "USER_MENU"
                      ? "Dashboard"
                      : "USER_MENU"
                  )
                }
              >
                <Icon
                  name="chevron"
                  size={17}
                />
              </button>


              {activeMenu ===
                "USER_MENU" && (

                <div className="user-dropdown-menu">

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                  >

                    <span>
                      <Icon
                        name="logout"
                        size={17}
                      />
                    </span>

                    Logout

                  </button>

                </div>

              )}


            </div>


          </div>


        </header>


        {/* =====================================================
            CONTENT
        ===================================================== */}

        <main className="dashboard-content">


          {/* ICARE */}

          {activeMenu ===
            "ICARE" && (

            <IcareRegistration />

          )}


          {/* TELECONSULT */}

          {activeMenu ===
            "Teleconsult" && (

            <Teleconsult />

          )}


          {/* MEDICINE */}

          {activeMenu ===
            "Medicine" && (

            <MedicineDelivery />

          )}


          {/* SUCCESSFUL DELIVERY */}

          {activeMenu ===
            "Successful" && (

            <SuccessfulDelivery
              records={
                successfulDeliveryRecords
              }
            />

          )}


          {/* CANCELLED DELIVERY */}

          {activeMenu ===
            "Cancelled" && (

            <CancelledDelivery
              records={
                cancelledDeliveryRecords
              }
            />

          )}


          {/* AUDIT HISTORY */}

          {activeMenu ===
            "AuditHistory" && (

            <AuditHistory />

          )}


          {/* DELETED RECORDS */}

          {activeMenu ===
            "DeletedRecords" && (

            <DeletedRecords />

          )}


          {/* =================================================
              DASHBOARD
          ================================================= */}

          {activeMenu ===
            "Dashboard" && (

            <>


              <div className="dashboard-heading">

                <div>

                  <h1>
                    YAKAP Monitoring Dashboard
                  </h1>

                  <p>
                    Monitor patient journey from registration
                    to medicine delivery
                  </p>

                </div>

              </div>


              {/* SUMMARY CARDS */}

              <section className="dashboard-cards">


                <div className="summary-card blue-card">

                  <div className="summary-icon">
                    <Icon
                      name="employees"
                      size={28}
                    />
                  </div>

                  <div>

                    <span>
                      Total Employees
                    </span>

                    <strong>
                      {totalEmployees}
                    </strong>

                    <small>
                      Total employee population
                    </small>

                  </div>

                </div>


                <div className="summary-card blue-card">

                  <div className="summary-icon">
                    <Icon
                      name="check"
                      size={28}
                    />
                  </div>

                  <div>

                    <span>
                      Registered (ICARE)
                    </span>

                    <strong>
                      {totalRegistered}
                    </strong>

                    <small>
                      Completed registration
                    </small>

                  </div>

                </div>


                <div className="summary-card blue-card">

                  <div className="summary-icon">
                    <Icon
                      name="teleconsult"
                      size={28}
                    />
                  </div>

                  <div>

                    <span>
                      Teleconsult
                    </span>

                    <strong>
                      {
                        teleconsultEndorsedRecords.length
                      }
                    </strong>

                    <small>
                      Endorsed for Teleconsult
                    </small>

                  </div>

                </div>


                <div className="summary-card blue-card">

                  <div className="summary-icon">
                    <Icon
                      name="medicine"
                      size={28}
                    />
                  </div>

                  <div>

                    <span>
                      Gamot Delivery
                    </span>

                    <strong>
                      {
                        medicineDeliveryCount
                      }
                    </strong>

                    <small>
                      For delivery / In progress
                    </small>

                  </div>

                </div>


                <div className="summary-card blue-card">

                  <div className="summary-icon">
                    <Icon
                      name="truck"
                      size={28}
                    />
                  </div>

                  <div>

                    <span>
                      Successful Delivery
                    </span>

                    <strong>
                      {
                        successfulDeliveryCount
                      }
                    </strong>

                    <small>
                      Successfully delivered
                    </small>

                  </div>

                </div>


                <div className="summary-card blue-card">

                  <div className="summary-icon">
                    <Icon
                      name="x"
                      size={28}
                    />
                  </div>

                  <div>

                    <span>
                      Cancelled Delivery
                    </span>

                    <strong>
                      {
                        cancelledDeliveryCount
                      }
                    </strong>

                    <small>
                      Cancelled deliveries
                    </small>

                  </div>

                </div>


                <div className="summary-card blue-card">

                  <div className="summary-icon">
                    <Icon
                      name="warning"
                      size={28}
                    />
                  </div>

                  <div>

                    <span>
                      No PhilHealth No.
                    </span>

                    <strong>
                      {noPhilhealth}
                    </strong>

                    <small>
                      Missing PhilHealth number
                    </small>

                  </div>

                </div>


                <div className="summary-card blue-card">

                  <div className="summary-icon">
                    <Icon
                      name="clock"
                      size={28}
                    />
                  </div>

                  <div>

                    <span>
                      Not Registered
                    </span>

                    <strong>
                      {notRegistered}
                    </strong>

                    <small>
                      Registration still pending
                    </small>

                  </div>

                </div>


              </section>


              {/* PATIENT JOURNEY */}

              <section className="journey-panel">


                <h3>
                  PATIENT JOURNEY FLOW
                </h3>


                <div className="journey-flow">


                  <div className="journey-step">

                    <div className="step-number">
                      1
                    </div>

                    <div className="journey-icon">
                      <Icon
                        name="employees"
                        size={24}
                      />
                    </div>

                    <div>

                      <strong>
                        YAKAP REGISTRATION
                      </strong>

                      <p>
                        Patient registered and
                        2nd tranche completed
                      </p>

                    </div>

                  </div>


                  <div className="journey-arrow">
                    →
                  </div>


                  <div className="journey-step">

                    <div className="step-number">
                      2
                    </div>

                    <div className="journey-icon">
                      <Icon
                        name="teleconsult"
                        size={24}
                      />
                    </div>

                    <div>

                      <strong>
                        TELECONSULT
                      </strong>

                      <p>
                        Patient for teleconsultation
                        and evaluation
                      </p>

                    </div>

                  </div>


                  <div className="journey-arrow">
                    →
                  </div>


                  <div className="journey-step">

                    <div className="step-number">
                      3
                    </div>

                    <div className="journey-icon">
                      ▣
                    </div>

                    <div>

                      <strong>
                        GAMOT DELIVERY
                      </strong>

                      <p>
                        Medicine preparation
                        and delivery
                      </p>

                    </div>

                  </div>


                  <div className="journey-arrow">
                    →
                  </div>


                  <div className="journey-step">


                    <div className="history-icons">

                      <span className="success-dot">
                        ✓
                      </span>

                      <span className="cancel-dot">
                        ×
                      </span>

                    </div>


                    <div>

                      <strong>
                        DELIVERY HISTORY
                      </strong>

                      <p>
                        Successful or
                        cancelled deliveries
                      </p>

                    </div>

                  </div>


                </div>


              </section>


              {/* LOWER PANELS */}

              <section className="dashboard-panels">


                {/* ICARE */}

                <div className="data-panel">


                  <div className="data-panel-header">

                    <div>

                      <h3>

                        ICARE Registration

                        <span className="count-badge">
                          {
                            teleconsultEndorsedRecords.length
                          }
                        </span>

                      </h3>

                    </div>


                    <button
                      onClick={() =>
                        setActiveMenu(
                          "ICARE"
                        )
                      }
                    >
                      View All
                    </button>

                  </div>


                  <div className="mini-table">


                    <div className="mini-header">

                      <span>
                        Patient Name
                      </span>

                      <span>
                        PhilHealth No.
                      </span>

                      <span>
                        Status
                      </span>

                      <span>
                        Action
                      </span>

                    </div>


                    {allIcareData
                      .slice(0, 5)
                      .map(
                        (record) => {

                          const status =
                            String(
                              getValue(
                                record,
                                "registrationStatus"
                              )
                            )
                              .trim()
                              .toUpperCase();


                          const completed =
                            status ===
                              "COMPLETED" ||
                            status ===
                              "REGISTERED";


                          const fullName =
                            [
                              getValue(
                                record,
                                "firstName"
                              ),

                              getValue(
                                record,
                                "lastName"
                              ),

                            ]
                              .filter(
                                Boolean
                              )
                              .join(" ");


                          return (

                            <div
                              className="mini-row"
                              key={
                                record.id
                              }
                            >

                              <span>
                                {
                                  fullName ||
                                  "—"
                                }
                              </span>


                              <span>
                                {
                                  getValue(
                                    record,
                                    "philhealthNo"
                                  ) ||
                                  "—"
                                }
                              </span>


                              <span>

                                <b
                                  className={
                                    completed
                                      ? "badge-completed"
                                      : "badge-pending"
                                  }
                                >

                                  {
                                    status ||
                                    "PENDING"
                                  }

                                </b>

                              </span>


                              <span>
                                {
                                  completed
                                    ? "→"
                                    : "—"
                                }
                              </span>

                            </div>

                          );

                        }
                      )}

                  </div>


                  <button
                    className="panel-button"
                    onClick={() =>
                      setActiveMenu(
                        "ICARE"
                      )
                    }
                  >
                    + View ICARE Registration
                  </button>


                </div>


                {/* TELECONSULT */}

                <div className="data-panel">


                  <div className="data-panel-header">

                    <h3>

                      Teleconsult

                      <span className="count-badge">
                        {
                          completedRecords.length
                        }
                      </span>

                    </h3>


                    <button
                      onClick={() =>
                        setActiveMenu(
                          "Teleconsult"
                        )
                      }
                    >
                      View All
                    </button>

                  </div>


                  <div className="mini-table">


                    <div className="mini-header">

                      <span>
                        Patient Name
                      </span>

                      <span>
                        PhilHealth No.
                      </span>

                      <span>
                        Status
                      </span>

                      <span>
                        Action
                      </span>

                    </div>


                    {teleconsultEndorsedRecords
                      .slice(0, 5)
                      .map(
                        (record) => {

                          const fullName =
                            [
                              getValue(
                                record,
                                "firstName"
                              ),

                              getValue(
                                record,
                                "lastName"
                              ),

                            ]
                              .filter(
                                Boolean
                              )
                              .join(" ");


                          return (

                            <div
                              className="mini-row"
                              key={
                                record.id
                              }
                            >

                              <span>
                                {
                                  fullName ||
                                  "—"
                                }
                              </span>


                              <span>
                                {
                                  getValue(
                                    record,
                                    "philhealthNo"
                                  ) ||
                                  "—"
                                }
                              </span>


                              <span>

                                <b className="badge-completed">
                                  READY
                                </b>

                              </span>


                              <span>
                                →
                              </span>

                            </div>

                          );

                        }
                      )}

                  </div>


                  <button
                    className="panel-button"
                    onClick={() =>
                      setActiveMenu(
                        "Teleconsult"
                      )
                    }
                  >
                    View Teleconsult List
                  </button>


                </div>


                {/* GAMOT DELIVERY */}

                <div className="data-panel">


                  <div className="data-panel-header">

                    <h3>

                      Gamot Delivery

                      <span className="count-badge">
                        {
                          medicineDeliveryCount
                        }
                      </span>

                    </h3>


                    <button
                      onClick={() =>
                        setActiveMenu(
                          "Medicine"
                        )
                      }
                    >
                      View All
                    </button>

                  </div>


                  {deliveryPatients.length === 0 ? (

                    <div className="empty-mini">

                      <div className="empty-mini-icon">
                        ▣
                      </div>


                      <p>
                        No medicine delivery records yet.
                      </p>


                      <small>
                        Patients approved for medicine
                        delivery will appear here.
                      </small>

                    </div>

                  ) : (

                    <div className="mini-table">

                      <div className="mini-header">

                        <span>
                          Patient Name
                        </span>

                        <span>
                          PhilHealth No.
                        </span>

                        <span>
                          Status
                        </span>

                        <span>
                          Action
                        </span>

                      </div>


                      {deliveryPatients
                        .slice(0, 5)
                        .map(
                          (patient) => {

                            const fullName =
                              [
                                getIcareValue(
                                  patient,
                                  "firstName"
                                ),

                                getIcareValue(
                                  patient,
                                  "lastName"
                                ),

                              ]
                                .filter(
                                  Boolean
                                )
                                .join(" ");


                            const deliveryStatus =
                              getOverallDeliveryStatus(
                                patient
                              );


                            const statusClass =
                              deliveryStatus ===
                              "Completed"
                                ? "badge-completed"
                                : "badge-pending";


                            return (

                              <div
                                className="mini-row"
                                key={
                                  patient.id
                                }
                              >

                                <span>
                                  {
                                    fullName ||
                                    "—"
                                  }
                                </span>


                                <span>
                                  {
                                    getIcareValue(
                                      patient,
                                      "philhealthNo"
                                    ) ||
                                    getIcareValue(
                                      patient,
                                      "philHealthNo"
                                    ) ||
                                    "—"
                                  }
                                </span>


                                <span>

                                  <b
                                    className={
                                      statusClass
                                    }
                                  >
                                    {
                                      deliveryStatus
                                    }
                                  </b>

                                </span>


                                <span>
                                  →
                                </span>

                              </div>

                            );

                          }
                        )}

                    </div>

                  )}


                  <button
                    className="panel-button"
                    onClick={() =>
                      setActiveMenu(
                        "Medicine"
                      )
                    }
                  >
                    View Delivery List
                  </button>


                </div>


                {/* DELIVERY HISTORY */}

                <div className="data-panel">


                  <div className="data-panel-header">

                    <h3>
                      Delivery History
                    </h3>


                    <button
                      onClick={() =>
                        setActiveMenu(
                          "Successful"
                        )
                      }
                    >
                      View All
                    </button>

                  </div>


                  <div className="history-box success-history">

                    <div className="history-header">

                      <strong>
                        Successful Delivery
                      </strong>

                      <span>
                        {
                          successfulDeliveryCount
                        }
                      </span>

                    </div>


                    <p>

                      {
                        successfulDeliveryCount === 0
                          ? "No successful delivery records."
                          : successfulDeliveryCount === 1
                            ? "1 successfully completed delivery."
                            : `${successfulDeliveryCount} successfully completed deliveries.`
                      }

                    </p>

                  </div>


                  <div className="history-box cancelled-history">

                    <div className="history-header">

                      <strong>
                        Cancelled Delivery
                      </strong>

                      <span>
                        {
                          cancelledDeliveryCount
                        }
                      </span>

                    </div>


                    <p>

                      {
                        cancelledDeliveryCount === 0
                          ? "No cancelled delivery records."
                          : cancelledDeliveryCount === 1
                            ? "1 cancelled delivery record."
                            : `${cancelledDeliveryCount} cancelled delivery records.`
                      }

                    </p>

                  </div>


                </div>


              </section>


              {/* FOOTER */}

              <footer className="dashboard-footer">

                © 2026 1Life Healthcare, Inc. All rights reserved.

                <span>
                  |
                </span>

                YAKAP Monitoring System v1.0.0

              </footer>


            </>

          )}


        </main>


      </div>


    </div>

  );

}


export default App;

/* Professional inline SVG icons - no external package */