import { useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import auth from "./firebase/auth";
import IcareRegistration from "./IcareRegistration";
import Teleconsult from "./Teleconsult";
import "./App.css";
import "./Login.css";
import MedicineDelivery from "./MedicineDelivery";

function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [icareData, setIcareData] = useState([]);
  const [icareLoading, setIcareLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeMenu, setActiveMenu] = useState("Dashboard");


  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setUser(userCredential.user);
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setUser(null);
      setEmail("");
      setPassword("");
      setIcareData([]);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };


// =========================
// LOAD ICARE FROM GOOGLE SHEETS
// =========================

useEffect(() => {
  if (!user) return;

  const loadIcareData = async () => {
    try {
      setIcareLoading(true);
      setError("");

      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzjQdFUl17reI760ThdB9zn5M3L2xWMyFFZGSL9KaKCc0DrhNhooKFE8RGGqoJr20FU/exec"
      );

      if (!response.ok) {
        throw new Error(
          `HTTP error: ${response.status}`
        );
      }

      const records = await response.json();

      console.log("=================================");
      console.log("ICARE DATA FROM GOOGLE SHEETS");
      console.log(records);
      console.log(
        "ICARE RECORD COUNT:",
        records?.length
      );
      console.log("=================================");

      if (!Array.isArray(records)) {
        throw new Error(
          "Invalid ICARE data format."
        );
      }

      const recordsWithId = records.map(
        (record, index) => ({
          id: record.id || `sheet-${index}`,
          ...record,
        })
      );

      setIcareData(recordsWithId);

    } catch (error) {
      console.error(
        "Unable to load Google Sheets data:",
        error
      );

      setError(
        "Unable to load ICARE data from Google Sheets."
      );

      setIcareData([]);

    } finally {
      setIcareLoading(false);
    }
  };

  loadIcareData();

}, [user]);

  // =========================
  // HELPERS
  // =========================

  const getValue = (record, field) => {
    return record[field] ?? "";
  };

  const formatDate = (value) => {
    if (!value) return "";

    if (value?.toDate) {
      return value.toDate().toLocaleDateString("en-PH");
    }

    if (value instanceof Date) {
      return value.toLocaleDateString("en-PH");
    }

    return String(value);
  };

  // =========================
  // SEARCH + FILTER
  // =========================

  const filteredIcareData = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return icareData.filter((record) => {
      const philhealth = String(
        getValue(record, "philhealthNo")
      ).toLowerCase();

      const lastName = String(
        getValue(record, "lastName")
      ).toLowerCase();

      const firstName = String(
        getValue(record, "firstName")
      ).toLowerCase();

      const status = String(
        getValue(record, "registrationStatus")
      ).toUpperCase();

      const matchesSearch =
        searchText === "" ||
        philhealth.includes(searchText) ||
        lastName.includes(searchText) ||
        firstName.includes(searchText);

      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [icareData, search, statusFilter]);

  // =========================
// SUMMARY
// =========================

const savedPatients = JSON.parse(
  localStorage.getItem("icarePatients") || "[]"
);


// TOTAL EMPLOYEES
const totalEmployees =
  icareData.length + savedPatients.length;


// TOTAL REGISTERED
const totalRegistered =
  icareData.filter(
    (record) =>
      ["REGISTERED", "COMPLETED"].includes(
        String(
          getValue(
            record,
            "registrationStatus"
          )
        ).toUpperCase()
      )
  ).length
  +
  savedPatients.filter(
    (record) =>
      ["REGISTERED", "COMPLETED"].includes(
        String(
          getValue(
            record,
            "registrationStatus"
          )
        ).toUpperCase()
      )
  ).length;


// NO PHILHEALTH
const noPhilhealth =
  icareData.filter(
    (record) =>
      String(
        getValue(
          record,
          "philhealthNo"
        )
      ).trim() === ""
  ).length
  +
  savedPatients.filter(
    (record) =>
      String(
        getValue(
          record,
          "philhealthNo"
        )
      ).trim() === ""
  ).length;


// NOT REGISTERED
const notRegistered =
  icareData.filter(
    (record) =>
      !["REGISTERED", "COMPLETED"].includes(
        String(
          getValue(
            record,
            "registrationStatus"
          )
        ).toUpperCase()
      )
  ).length
  +
  savedPatients.filter(
    (record) =>
      !["REGISTERED", "COMPLETED"].includes(
        String(
          getValue(
            record,
            "registrationStatus"
          )
        ).toUpperCase()
      )
  ).length;

  // =========================
  // PROCEED TO TELECONSULT
  // =========================

  const handleProceedToTeleconsult = (record) => {
    console.log("Proceed to Teleconsult:", record);

    const fullName = [
      getValue(record, "firstName"),
      getValue(record, "middleName"),
      getValue(record, "lastName"),
    ]
      .filter(Boolean)
      .join(" ");

    alert(`${fullName} is ready for Teleconsult.`);
  };

  // =========================
// LOGIN PAGE
// =========================

if (!user) {
  return (
    <div className="login-page">

      <div className="login-card">

        {/* =====================================================
            LEFT SIDE
            ===================================================== */}

        <div className="login-left">

          {/* LOGO */}

          <div className="login-logo-area">
            <img
              src="/Primary with tagline.png"
              alt="1Life"
              className="login-company-logo"
            />
          </div>


          {/* YAKAP BRAND */}

          <div className="yakap-brand">

            <div className="heartbeat-line">
              <span></span>
            </div>

            <h1>YAKAP</h1>

            <h2>MONITORING</h2>

            <div className="yakap-subtitle">
              YAKAP Registration &amp;<br />
              Medicine Delivery System
            </div>

          </div>


          {/* FEATURES */}

          <div className="login-features">

            <div className="login-feature-card">

              <div className="feature-icon">
                ✓
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
                +
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
                ✚
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


          {/* CARE MESSAGE */}

          <div className="care-message">

            <span>
              We care. We monitor. We deliver.
            </span>

          </div>

        </div>


        {/* =====================================================
            RIGHT SIDE
            ===================================================== */}

        <div className="login-right">

          <div className="login-form-container">

            {/* WELCOME */}

            <div className="login-welcome">

              <h2>
                Welcome Back!
              </h2>

              <div className="welcome-line"></div>

              <p>
                Please login to continue
              </p>

            </div>


            {/* FORM */}

            <form onSubmit={handleLogin}>

              {/* EMAIL */}

              <div className="form-group">

                <label htmlFor="email">
                  Email
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    ✉
                  </span>

                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
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
                    🔒
                  </span>

                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />

                  <span className="password-eye">
                    ◉
                  </span>

                </div>

              </div>


              {/* FORGOT PASSWORD */}

              <div className="forgot-password">
                Forgot your password?
              </div>


              {/* ERROR */}

              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}


              {/* LOGIN */}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >

                <span className="login-lock">
                  🔒
                </span>

                {loading
                  ? "SIGNING IN..."
                  : "LOGIN"}

              </button>

            </form>


            {/* OR */}

            <div className="login-or">

              <span></span>

              <strong>OR</strong>

              <span></span>

            </div>


            {/* SECURE LOGIN */}

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


      {/* FOOTER */}

      <div className="login-footer">
        © 2025 <strong>1Life Healthcare, Inc.</strong> All rights reserved.
      </div>

    </div>
  );
}

  // =========================
// MAIN APP
// =========================

const completedRecords = icareData.filter((record) => {
  const status = String(
    getValue(record, "registrationStatus")
  ).toUpperCase();

  return status === "COMPLETED" || status === "REGISTERED";
});

const pendingRecords = icareData.filter((record) => {
  const status = String(
    getValue(record, "registrationStatus")
  ).toUpperCase();

  return status !== "COMPLETED" && status !== "REGISTERED";
});

// =========================
// PAGE CONTENT
// =========================

const renderTeleconsultPage = () => {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Teleconsult</h1>
          <p>
            Patients who completed ICARE registration and are ready
            for teleconsultation.
          </p>
        </div>
      </div>

      <div className="page-summary-cards">
        <div className="page-summary-card">
          <span>Ready for Teleconsult</span>
          <strong>{completedRecords.length}</strong>
          <small>Completed ICARE registration</small>
        </div>

        <div className="page-summary-card">
          <span>For Evaluation</span>
          <strong>0</strong>
          <small>Pending teleconsultation</small>
        </div>

        <div className="page-summary-card">
          <span>Completed Teleconsult</span>
          <strong>0</strong>
          <small>Successfully evaluated</small>
        </div>
      </div>

      <div className="page-panel">
        <div className="page-panel-header">
          <div>
            <h2>Teleconsult Patient List</h2>
            <p>
              Patients with completed ICARE registration
            </p>
          </div>

          <input
            className="page-search"
            type="text"
            placeholder="Search patient..."
          />
        </div>

        <div className="patient-table">
          <div className="patient-table-header">
            <span>Patient Name</span>
            <span>PhilHealth No.</span>
            <span>Date of Birth</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {completedRecords.length === 0 ? (
            <div className="page-empty">
              <div>♧</div>
              <strong>No patients for Teleconsult</strong>
              <p>
                Patients with completed ICARE registration
                will appear here.
              </p>
            </div>
          ) : (
            completedRecords.map((record) => {
              const fullName = [
                getValue(record, "firstName"),
                getValue(record, "middleName"),
                getValue(record, "lastName"),
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  className="patient-table-row"
                  key={record.id}
                >
                  <span>
                    <strong>{fullName || "—"}</strong>
                  </span>

                  <span>
                    {getValue(record, "philhealthNo") || "—"}
                  </span>

                  <span>
                    {formatDate(
                      getValue(record, "dateOfBirth")
                    ) || "—"}
                  </span>

                  <span>
                    <b className="status-ready">
                      READY
                    </b>
                  </span>

                  <span>
                    <button
                      className="action-button"
                      onClick={() =>
                        handleProceedToTeleconsult(record)
                      }
                    >
                      Start Teleconsult
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};


// =========================
// SUCCESSFUL DELIVERY PAGE
// =========================

const renderSuccessfulPage = () => {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Successful Delivery</h1>
          <p>
            Successfully completed medicine deliveries.
          </p>
        </div>
      </div>

      <div className="page-panel">
        <div className="page-panel-header">
          <div>
            <h2>Successful Delivery Records</h2>
            <p>Completed medicine deliveries</p>
          </div>

          <input
            className="page-search"
            type="text"
            placeholder="Search patient..."
          />
        </div>

        <div className="page-empty">
          <div className="history-success-icon">✓</div>

          <strong>
            No successful delivery records
          </strong>

          <p>
            Completed deliveries will appear here.
          </p>
        </div>
      </div>
    </>
  );
};


// =========================
// CANCELLED DELIVERY PAGE
// =========================

const renderCancelledPage = () => {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Cancelled Delivery</h1>
          <p>
            View medicine deliveries that were cancelled.
          </p>
        </div>
      </div>

      <div className="page-panel">
        <div className="page-panel-header">
          <div>
            <h2>Cancelled Delivery Records</h2>
            <p>Cancelled medicine deliveries</p>
          </div>

          <input
            className="page-search"
            type="text"
            placeholder="Search patient..."
          />
        </div>

        <div className="page-empty">
          <div className="history-cancel-icon">×</div>

          <strong>
            No cancelled delivery records
          </strong>

          <p>
            Cancelled deliveries will appear here.
          </p>
        </div>
      </div>
    </>
  );
};
return (
  <div className="dashboard-layout">

    {/* =========================
        SIDEBAR
    ========================= */}

    <aside className="sidebar">

      <div className="sidebar-logo">
        <img
          src="/Primary with tagline.png"
          alt="1Life"
        />
      </div>

      <nav className="sidebar-nav">

        <button
          className={`nav-item ${
            activeMenu === "Dashboard" ? "active" : ""
          }`}
          onClick={() => setActiveMenu("Dashboard")}
        >
          <span className="nav-icon">⌂</span>
          Dashboard
        </button>

        <button
          className={`nav-item ${
            activeMenu === "ICARE" ? "active" : ""
          }`}
          onClick={() => setActiveMenu("ICARE")}
        >
          <span className="nav-icon">🪪</span>
          YAKAP REGISTRATION
        </button>

        <button
          className={`nav-item ${
            activeMenu === "Teleconsult" ? "active" : ""
          }`}
          onClick={() => setActiveMenu("Teleconsult")}
        >
<span className="nav-icon">📞</span>
          TELECONSULT
        </button>

        <button
          className={`nav-item ${
            activeMenu === "Medicine" ? "active" : ""
          }`}
          onClick={() => setActiveMenu("Medicine")}
        >
          <span className="nav-icon">💊</span>
          MEDICINE DELIVERY
        </button>

        <div className="nav-section-title">
          DELIVERY HISTORY
        </div>

        <button
          className="nav-subitem"
          onClick={() => setActiveMenu("Successful")}
        >
          <span className="success-dot">✓</span>
          Successful Delivery
        </button>

        <button
          className="nav-subitem"
          onClick={() => setActiveMenu("Cancelled")}
        >
          <span className="cancel-dot">×</span>
          Cancelled Delivery
        </button>

        <button className="nav-item">
          <span className="nav-icon">▥</span>
          Reports
        </button>

        <button className="nav-item">
          <span className="nav-icon">⚙</span>
          Settings
        </button>

        <button className="nav-item">
          <span className="nav-icon">♙</span>
          Users
        </button>

        <button
          className="nav-item"
          onClick={handleLogout}
        >
          <span className="nav-icon">↪</span>
          Logout
        </button>

      </nav>

      <div className="sidebar-care">
        <div className="care-icon">
          ♡
        </div>

        <strong>We care.</strong>
        <strong>We monitor.</strong>
        <strong>We deliver.</strong>
      </div>

    </aside>


    {/* =========================
        MAIN CONTENT
    ========================= */}

    <div className="main-content">

      {/* TOPBAR */}

      <header className="dashboard-topbar">

        <div className="dashboard-title-area">

          <span className="menu-symbol">
            ☰
          </span>

          <span>
            Dashboard
          </span>

        </div>

        <div className="dashboard-user">

  <span className="dashboard-date">
    {new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}
  </span>

  <div className="user-divider"></div>

  <div className="user-avatar">
    ●
  </div>

  <div className="user-info">
    <strong>{user.email}</strong>
    <small>Administrator</small>
  </div>

  <div className="user-dropdown">

    <button
      type="button"
      className="user-dropdown-toggle"
      onClick={() =>
        setActiveMenu(
          activeMenu === "USER_MENU"
            ? "Dashboard"
            : "USER_MENU"
        )
      }
    >
      ⌄
    </button>

    {activeMenu === "USER_MENU" && (
      <div className="user-dropdown-menu">

        <button
          type="button"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </div>
    )}

  </div>

</div>

      </header>


      {/* CONTENT */}

      <main className="dashboard-content">

          {activeMenu === "ICARE" && <IcareRegistration />}

{activeMenu === "Teleconsult" && <Teleconsult />}
{activeMenu === "Medicine" && <MedicineDelivery />}
  {activeMenu === "Successful" && renderSuccessfulPage()}
  {activeMenu === "Cancelled" && renderCancelledPage()}

  {activeMenu === "Dashboard" && (
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


        {/* =========================
            SUMMARY CARDS
        ========================= */}

        <section className="dashboard-cards">

          <div className="summary-card blue-card">

            <div className="summary-icon">
              👥
            </div>

            <div>
              <span>Total Employees</span>
              <strong>{totalEmployees}</strong>
              <small>Total employee population</small>
            </div>

          </div>


          <div className="summary-card blue-card">

            <div className="summary-icon">
              ✓
            </div>

            <div>
              <span>Registered (ICARE)</span>
              <strong>{totalRegistered}</strong>
              <small>Completed registration</small>
            </div>

          </div>


          <div className="summary-card blue-card">

            <div className="summary-icon">
              ♧
            </div>

            <div>
              <span>Teleconsult</span>
              <strong>{completedRecords.length}</strong>
              <small>Ready for / Completed</small>
            </div>

          </div>


          <div className="summary-card blue-card">

            <div className="summary-icon">
              ◇
            </div>

            <div>
              <span>Gamot Delivery</span>
              <strong>0</strong>
              <small>For delivery / In progress</small>
            </div>

          </div>


          <div className="summary-card blue-card">

            <div className="summary-icon">
              □
            </div>

            <div>
              <span>Successful Delivery</span>
              <strong>0</strong>
              <small>Successfully delivered</small>
            </div>

          </div>


          <div className="summary-card blue-card">

            <div className="summary-icon">
              ×
            </div>

            <div>
              <span>Cancelled Delivery</span>
              <strong>0</strong>
              <small>Cancelled deliveries</small>
            </div>

          </div>


          <div className="summary-card blue-card">

            <div className="summary-icon">
              !
            </div>

            <div>
              <span>No PhilHealth No.</span>
              <strong>{noPhilhealth}</strong>
              <small>Missing PhilHealth number</small>
            </div>

          </div>


          <div className="summary-card blue-card">

            <div className="summary-icon">
              ⌛
            </div>

            <div>
              <span>Not Registered</span>
              <strong>{notRegistered}</strong>
              <small>Registration still pending</small>
            </div>

          </div>

        </section>


        {/* =========================
            PATIENT JOURNEY
        ========================= */}

        <section className="journey-panel">

          <h3>PATIENT JOURNEY FLOW</h3>

          <div className="journey-flow">

            <div className="journey-step">

              <div className="step-number">
                1
              </div>

              <div className="journey-icon">
                👥
              </div>

              <div>
                <strong>ICARE REGISTRATION</strong>

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
                ♧
              </div>

              <div>
                <strong>TELECONSULT</strong>

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
                <strong>GAMOT DELIVERY</strong>

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
                <span className="success-dot">✓</span>
                <span className="cancel-dot">×</span>
              </div>

              <div>
                <strong>DELIVERY HISTORY</strong>

                <p>
                  Successful or
                  cancelled deliveries
                </p>
              </div>

            </div>

          </div>

        </section>


        {/* =========================
            LOWER PANELS
        ========================= */}

        <section className="dashboard-panels">


          {/* ICARE */}

          <div className="data-panel">

            <div className="data-panel-header">

              <div>
                <h3>
                  ICARE Registration
                  <span className="count-badge">
                    {icareData.length}
                  </span>
                </h3>
              </div>

              <button
                onClick={() => setActiveMenu("ICARE")}
              >
                View All
              </button>

            </div>


            <div className="mini-table">

              <div className="mini-header">
                <span>Patient Name</span>
                <span>PhilHealth No.</span>
                <span>Status</span>
                <span>Action</span>
              </div>


              {icareData.slice(0, 5).map((record) => {

                const status = String(
                  getValue(
                    record,
                    "registrationStatus"
                  )
                ).toUpperCase();

                const completed =
                  status === "COMPLETED" ||
                  status === "REGISTERED";

                const fullName = [
                  getValue(record, "firstName"),
                  getValue(record, "lastName"),
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    className="mini-row"
                    key={record.id}
                  >

                    <span>
                      {fullName || "—"}
                    </span>

                    <span>
                      {getValue(
                        record,
                        "philhealthNo"
                      ) || "—"}
                    </span>

                    <span>
                      <b
                        className={
                          completed
                            ? "badge-completed"
                            : "badge-pending"
                        }
                      >
                        {status || "PENDING"}
                      </b>
                    </span>

                    <span>
                      {completed ? "→" : "—"}
                    </span>

                  </div>
                );

              })}

            </div>


            <button
              className="panel-button"
              onClick={() => setActiveMenu("ICARE")}
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
                  {completedRecords.length}
                </span>
              </h3>

              <button
                onClick={() =>
                  setActiveMenu("Teleconsult")
                }
              >
                View All
              </button>

            </div>


            <div className="mini-table">

              <div className="mini-header">
                <span>Patient Name</span>
                <span>PhilHealth No.</span>
                <span>Status</span>
                <span>Action</span>
              </div>


              {completedRecords
                .slice(0, 5)
                .map((record) => {

                  const fullName = [
                    getValue(record, "firstName"),
                    getValue(record, "lastName"),
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div
                      className="mini-row"
                      key={record.id}
                    >

                      <span>
                        {fullName || "—"}
                      </span>

                      <span>
                        {getValue(
                          record,
                          "philhealthNo"
                        ) || "—"}
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

                })}

            </div>


            <button
              className="panel-button"
              onClick={() =>
                setActiveMenu("Teleconsult")
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
                  0
                </span>
              </h3>

              <button
                onClick={() =>
                  setActiveMenu("Medicine")
                }
              >
                View All
              </button>

            </div>


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


            <button
              className="panel-button"
              onClick={() =>
                setActiveMenu("Medicine")
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

              <button>
                View All
              </button>

            </div>


            <div className="history-box success-history">

              <div className="history-header">
                <strong>
                  Successful Delivery
                </strong>

                <span>0</span>
              </div>

              <p>
                No successful delivery records.
              </p>

            </div>


            <div className="history-box cancelled-history">

              <div className="history-header">
                <strong>
                  Cancelled Delivery
                </strong>

                <span>0</span>
              </div>

              <p>
                No cancelled delivery records.
              </p>

            </div>

          </div>

        </section>


        {/* FOOTER */}

        <footer className="dashboard-footer">

          © 2026 1Life Healthcare, Inc. All rights reserved.

          <span>|</span>

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
