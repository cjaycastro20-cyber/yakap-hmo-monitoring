import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./IcareRegistration.css";

function IcareRegistration({
  icareData = [],
  getValue = (record, key) =>
    record?.[key],
}) {
  /* =========================================================
     LOCAL STORAGE - ICARE PATIENTS
  ========================================================= */

  const [addedPatients, setAddedPatients] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            "icarePatients"
          );

        return saved
          ? JSON.parse(saved)
          : [];
      } catch (error) {
        console.error(
          "Error loading patients:",
          error
        );

        return [];
      }
    });

  useEffect(() => {
    localStorage.setItem(
      "icarePatients",
      JSON.stringify(
        addedPatients
      )
    );
  }, [addedPatients]);


  /* =========================================================
     COMPANY MANAGEMENT
     
     ADDED:
     Shared company list for YAKAP.
     
     Storage:
     "yakapCompanies"
  ========================================================= */

  const [companies, setCompanies] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            "yakapCompanies"
          );

        if (saved) {
          const parsed =
            JSON.parse(saved);

          if (
            Array.isArray(parsed)
          ) {
            return parsed;
          }
        }
      } catch (error) {
        console.error(
          "Error loading companies:",
          error
        );
      }

      /*
       * If there are existing patient
       * records, automatically collect
       * their company names.
       */
      return [];
    });


  const [selectedCompany, setSelectedCompany] =
    useState("ALL");


  const [showAddCompany, setShowAddCompany] =
    useState(false);


  const [newCompanyName, setNewCompanyName] =
    useState("");


  /*
   * Save companies whenever the list changes.
   */
  useEffect(() => {
    try {
      localStorage.setItem(
        "yakapCompanies",
        JSON.stringify(companies)
      );
    } catch (error) {
      console.error(
        "Error saving companies:",
        error
      );
    }
  }, [companies]);


  /*
   * Automatically discover company names
   * from existing ICARE records.
   *
   * This does NOT modify the patient records.
   */
  useEffect(() => {
    const discoveredCompanies = [];

    const sourceRecords = [
      ...(Array.isArray(icareData)
        ? icareData
        : []),

      ...(Array.isArray(
        addedPatients
      )
        ? addedPatients
        : []),
    ];

    sourceRecords.forEach(
      (record) => {
        const company = String(
          getValue(
            record,
            "company"
          ) || ""
        ).trim();

        if (
          company &&
          !discoveredCompanies.includes(
            company
          )
        ) {
          discoveredCompanies.push(
            company
          );
        }
      }
    );

    if (
      discoveredCompanies.length ===
      0
    ) {
      return;
    }

    setCompanies((prev) => {
      const existing = Array.isArray(
        prev
      )
        ? prev
        : [];

      const merged = [
        ...existing,
      ];

      discoveredCompanies.forEach(
        (company) => {
          const alreadyExists =
            merged.some(
              (item) =>
                String(item)
                  .trim()
                  .toLowerCase() ===
                company
                  .trim()
                  .toLowerCase()
            );

          if (
            !alreadyExists
          ) {
            merged.push(
              company
            );
          }
        }
      );

      if (
        merged.length ===
        existing.length
      ) {
        return existing;
      }

      return merged;
    });
  }, [
    icareData,
    addedPatients,
    getValue,
  ]);


  /* =========================================================
     ADD COMPANY
  ========================================================= */

  const handleOpenAddCompany = () => {
    setNewCompanyName("");

    setShowAddCompany(true);
  };


  const handleCloseAddCompany = () => {
    setShowAddCompany(false);

    setNewCompanyName("");
  };


  const handleSaveCompany = (e) => {
    e.preventDefault();

    const companyName =
      newCompanyName.trim();

    if (!companyName) {
      alert(
        "Please enter a company name."
      );

      return;
    }

    /*
     * Prevent duplicate company names.
     */
    const existingCompany =
      companies.find(
        (company) =>
          String(company)
            .trim()
            .toLowerCase() ===
          companyName.toLowerCase()
      );

    if (existingCompany) {
      alert(
        "This company already exists."
      );

      return;
    }

    /*
     * Add company to shared company list.
     */
    setCompanies((prev) => [
      ...(Array.isArray(prev)
        ? prev
        : []),
      companyName,
    ]);

    /*
     * Automatically select the newly
     * created company.
     */
    setSelectedCompany(
      companyName
    );

    handleCloseAddCompany();
  };


  /* =========================================================
     STATES
  ========================================================= */

  const [search, setSearch] =
    useState("");

  const [showAddPatient, setShowAddPatient] =
    useState(false);

  const [editingPatient, setEditingPatient] =
    useState(null);


  /* =========================================================
     EMPTY PATIENT
  ========================================================= */

  const emptyPatient = {
    company: "",
    no: "",
    philhealthNo: "",
    lastName: "",
    firstName: "",
    middleName: "",
    dateOfBirth: "",
    address: "",
    pcu: "",
    registrationStatus:
      "PENDING",
    dateRegistered: "",
    fpe: "",
    remarks: "",
  };


  const [newPatient, setNewPatient] =
    useState(emptyPatient);


  /* =========================================================
     COMBINE DATA
  ========================================================= */

  const allPatients = useMemo(() => {
    return [
      ...icareData,
      ...addedPatients,
    ];
  }, [
    icareData,
    addedPatients,
  ]);


  /* =========================================================
     AUTOMATIC TELECONSULT SYNCHRONIZATION
     
     Kapag FPE = COMPLETED:
     - create Teleconsult record kung wala pa
     - update Teleconsult record kung existing na
     
     Kapag na-edit ang ICARE patient:
     - automatic update ang basic information sa Teleconsult
  ========================================================= */

  useEffect(() => {
    const completedPatients =
      allPatients.filter(
        (record) => {
          const fpe = String(
            getValue(
              record,
              "fpe"
            ) ||
              getValue(
                record,
                "FPE"
              ) ||
              ""
          )
            .trim()
            .toUpperCase();

          return (
            fpe === "COMPLETED"
          );
        }
      );

    if (
      completedPatients.length ===
      0
    ) {
      return;
    }

    try {
      const savedTeleconsult =
        localStorage.getItem(
          "teleconsultPatients"
        );

      let teleconsultPatients =
        savedTeleconsult
          ? JSON.parse(
              savedTeleconsult
            )
          : [];

      let changed = false;

      completedPatients.forEach(
        (icarePatient) => {
          /*
           * Important:
           * Gumagawa tayo ng permanent identifier
           * para hindi ma-duplicate sa Teleconsult.
           */

          const icareId =
            icarePatient.id ||
            `icare-source-${String(
              getValue(
                icarePatient,
                "philhealthNo"
              ) ||
                getValue(
                  icarePatient,
                  "lastName"
                ) ||
                getValue(
                  icarePatient,
                  "firstName"
                ) ||
                ""
            )
              .trim()
              .toLowerCase()
              .replace(
                /\s+/g,
                "-"
              )}`;

          const existingIndex =
            teleconsultPatients.findIndex(
              (
                teleconsultPatient
              ) =>
                teleconsultPatient.icareId ===
                icareId
            );

          /*
           * Data na manggagaling sa ICARE.
           *
           * Ito lang ang automatic na ina-update.
           *
           * Hindi natin gagalawin:
           * dateOfCall
           * nextTeleconsult
           * status
           * remarks
           * medicineDelivery
           * firstDelivery
           */

          const syncedData = {
            company:
              getValue(
                icarePatient,
                "company"
              ) || "",

            no:
              getValue(
                icarePatient,
                "no"
              ) || "",

            philHealthNo:
              getValue(
                icarePatient,
                "philhealthNo"
              ) || "",

            lastName:
              getValue(
                icarePatient,
                "lastName"
              ) || "",

            firstName:
              getValue(
                icarePatient,
                "firstName"
              ) || "",

            middleName:
              getValue(
                icarePatient,
                "middleName"
              ) || "",

            dateOfBirth:
              getValue(
                icarePatient,
                "dateOfBirth"
              ) || "",

            address:
              getValue(
                icarePatient,
                "address"
              ) || "",

            /*
             * Reference kung saan galing
             * ang Teleconsult record.
             */
            icareId:
              icareId,

            /*
             * Markahan natin na galing ito sa ICARE.
             */
            syncedFromIcare:
              true,
          };

          /* =====================================================
             EXISTING TELECONSULT RECORD
          ===================================================== */

          if (
            existingIndex !== -1
          ) {
            const existingRecord =
              teleconsultPatients[
                existingIndex
              ];

            const updatedRecord = {
              ...existingRecord,

              /*
               * Update only ICARE fields.
               */
              ...syncedData,
            };

            teleconsultPatients[
              existingIndex
            ] = updatedRecord;

            changed = true;
          }

          /* =====================================================
             NEW TELECONSULT RECORD
          ===================================================== */

          else {
            const newTeleconsultRecord =
              {
                id:
                  "teleconsult-icare-" +
                  Date.now() +
                  "-" +
                  Math.random()
                    .toString(
                      36
                    )
                    .substring(
                      2,
                      8
                    ),

                /*
                 * ICARE reference
                 */
                ...syncedData,

                /*
                 * TELECONSULT DEFAULT VALUES
                 */

                age: "",

                contactNo: "",

                dateOfCall: "",

                nextTeleconsult:
                  "",

                status:
                  "Call Done",

                remarks: "",

                medicineDelivery:
                  "No",

                firstDelivery:
                  "",
              };

            teleconsultPatients =
              [
                ...teleconsultPatients,
                newTeleconsultRecord,
              ];

            changed = true;
          }
        }
      );

      /*
       * Save only if may changes.
       */

      if (changed) {
        localStorage.setItem(
          "teleconsultPatients",
          JSON.stringify(
            teleconsultPatients
          )
        );

        /*
         * Event para ma-detect ng Teleconsult
         * component na may bagong data.
         */
        window.dispatchEvent(
          new Event(
            "teleconsultPatientsUpdated"
          )
        );
      }
    } catch (error) {
      console.error(
        "Error syncing ICARE to Teleconsult:",
        error
      );
    }
  }, [
    allPatients,
    getValue,
  ]);


  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredIcareData =
    useMemo(() => {
      const keyword =
        search
          .toLowerCase()
          .trim();

      let records =
        allPatients;

      /*
       * COMPANY FILTER
       *
       * "ALL" means show all companies.
       */
      if (
        selectedCompany !==
        "ALL"
      ) {
        records =
          records.filter(
            (record) => {
              const company =
                String(
                  getValue(
                    record,
                    "company"
                  ) || ""
                ).trim();

              return (
                company.toLowerCase() ===
                selectedCompany
                  .trim()
                  .toLowerCase()
              );
            }
          );
      }

      if (!keyword) {
        return records;
      }

      return records.filter(
        (record) => {
          const values = [
            getValue(
              record,
              "philhealthNo"
            ),
            getValue(
              record,
              "lastName"
            ),
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
              "company"
            ),
          ];

          return values.some(
            (value) =>
              String(
                value || ""
              )
                .toLowerCase()
                .includes(
                  keyword
                )
          );
        }
      );
    }, [
      allPatients,
      search,
      selectedCompany,
      getValue,
    ]);


  /* =========================================================
     SUMMARY
  ========================================================= */

  const totalEmployees =
    filteredIcareData.length;

  const totalRegistered =
    filteredIcareData.filter(
      (record) =>
        [
          "REGISTERED",
          "COMPLETED",
        ].includes(
          String(
            getValue(
              record,
              "registrationStatus"
            ) || ""
          ).toUpperCase()
        )
    ).length;

  const noPhilhealth =
    filteredIcareData.filter(
      (record) =>
        String(
          getValue(
            record,
            "philhealthNo"
          ) || ""
        ).trim() === ""
    ).length;

  const notRegistered =
    filteredIcareData.filter(
      (record) =>
        ![
          "REGISTERED",
          "COMPLETED",
        ].includes(
          String(
            getValue(
              record,
              "registrationStatus"
            ) || ""
          ).toUpperCase()
        )
    ).length;


  /* =========================================================
     INPUT HANDLER
  ========================================================= */

  const handleInputChange = (
    e
  ) => {
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


  /* =========================================================
     OPEN ADD
  ========================================================= */

  const handleAddPatient = () => {
    setEditingPatient(
      null
    );

    setNewPatient({
      ...emptyPatient,

      /*
       * If a specific company is selected,
       * automatically assign it to the new patient.
       */
      company:
        selectedCompany !==
        "ALL"
          ? selectedCompany
          : "",

      no: String(
        allPatients.length +
          1
      ),
    });

    setShowAddPatient(
      true
    );
  };


  /* =========================================================
     OPEN EDIT
  ========================================================= */

  const handleEditPatient = (
    patient
  ) => {
    setEditingPatient(
      patient
    );

    setNewPatient({
      ...emptyPatient,
      ...patient,
    });

    setShowAddPatient(
      true
    );
  };


  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const handleCloseModal = () => {
    setShowAddPatient(
      false
    );

    setEditingPatient(
      null
    );

    setNewPatient(
      emptyPatient
    );
  };


  /* =========================================================
     SAVE PATIENT
  ========================================================= */

  const handleSavePatient = (
    e
  ) => {
    e.preventDefault();

    if (
      !newPatient.lastName.trim() ||
      !newPatient.firstName.trim()
    ) {
      alert(
        "Please enter Last Name and First Name."
      );

      return;
    }

    /* =====================================================
       EDIT EXISTING PATIENT
    ===================================================== */

    if (editingPatient) {
      setAddedPatients(
        (prev) =>
          prev.map(
            (patient) =>
              patient.id ===
              editingPatient.id
                ? {
                    ...newPatient,
                    id:
                      editingPatient.id,
                  }
                : patient
          )
      );
    }

    /* =====================================================
       ADD NEW PATIENT
    ===================================================== */

    else {
      const patient = {
        ...newPatient,

        id:
          "icare-" +
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .substring(2, 8),

        no:
          newPatient.no ||
          String(
            allPatients.length +
              1
          ),
      };

      setAddedPatients(
        (prev) => [
          ...prev,
          patient,
        ]
      );
    }

    handleCloseModal();
  };


  /* =========================================================
     DELETE
  ========================================================= */

  const handleDeletePatient = (
    patient
  ) => {
    const confirmed =
      window.confirm(
        `Delete ${getValue(
          patient,
          "firstName"
        )} ${getValue(
          patient,
          "lastName"
        )}?`
      );

    if (!confirmed)
      return;

    /*
     * Kapag manually added ICARE patient,
     * matatanggal din siya sa addedPatients.
     */
    setAddedPatients(
      (prev) =>
        prev.filter(
          (item) =>
            item.id !==
            patient.id
        )
    );

    /*
     * Kung galing siya sa ICARE at COMPLETED,
     * alisin din ang corresponding Teleconsult record.
     */
    try {
      const savedTeleconsult =
        localStorage.getItem(
          "teleconsultPatients"
        );

      if (
        savedTeleconsult
      ) {
        const teleconsultPatients =
          JSON.parse(
            savedTeleconsult
          );

        const updatedTeleconsult =
          teleconsultPatients.filter(
            (item) =>
              item.icareId !==
              patient.id
          );

        localStorage.setItem(
          "teleconsultPatients",
          JSON.stringify(
            updatedTeleconsult
          )
        );

        window.dispatchEvent(
          new Event(
            "teleconsultPatientsUpdated"
          )
        );
      }
    } catch (error) {
      console.error(
        "Error removing synced Teleconsult record:",
        error
      );
    }
  };


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="icare-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

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


      {/* =====================================================
    SEARCH
===================================================== */}

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
        setSearch(e.target.value)
      }
    />

  </div>

</div>


{/* =====================================================
    COMPANY CONTROLS
===================================================== */}

<div className="icare-company-row">

  {/* COMPANY SELECTOR */}

  <div
    className="icare-company-selector"
    style={{
      minHeight: "32px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "6px 12px",
      border: "1px solid #e2e8f0",
      borderRadius: "14px",
      background: "#ffffff",
      boxShadow: "0 3px 12px rgba(15, 23, 42, 0.05)",
      boxSizing: "border-box",
    }}
  >

    <label
      style={{
        display: "block",
        marginBottom: "5px",
        color: "#64748b",
        fontSize: "9px",
        fontWeight: "700",
        letterSpacing: "0.4px",
      }}
    >
      COMPANY
    </label>

    <select
      value={selectedCompany}
      onChange={(e) =>
        setSelectedCompany(e.target.value)
      }
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        color: "#0f172a",
        fontFamily: "inherit",
        fontSize: "12px",
        fontWeight: "700",
        cursor: "pointer",
      }}
    >

      <option value="ALL">
        All Companies
      </option>

      {companies.map((company) => (
        <option
          key={company}
          value={company}
        >
          {company}
        </option>
      ))}

    </select>

  </div>


  {/* ADD COMPANY */}

  <button
    type="button"
    className="icare-add-company-button"
    onClick={handleOpenAddCompany}
    style={{
      minHeight: "72px",
      border: "1px solid #bfdbfe",
      borderRadius: "14px",
      background: "#eff6ff",
      color: "#2563eb",
      fontFamily: "inherit",
      fontSize: "12px",
      fontWeight: "800",
      cursor: "pointer",
      boxShadow: "0 3px 12px rgba(15, 23, 42, 0.05)",
    }}
  >

    <span
      style={{
        display: "Row",
        fontSize: "30px",
        lineHeight: "1",
        marginBottom: "10px",
      }}
    >
      ＋
    </span>

    Add Company

  </button>

</div>


{/* =====================================================
    SUMMARY CARDS
===================================================== */}

<div className="icare-summary-grid">

  {/* TOTAL EMPLOYEES */}

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


  {/* TOTAL REGISTERED */}

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


  {/* NO PHILHEALTH */}

  <div className="icare-summary-card">

    <div className="icare-summary-icon philhealth">
      ⌛
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


  {/* NOT REGISTERED */}

  <div className="icare-summary-card">

    <div className="icare-summary-icon not-registered">
      ×
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


      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="icare-table-panel">

        <div className="icare-table-title">

          <div>

            <h2>
              ICARE REGISTRATION LIST
            </h2>

            <p>
              Employee registration records
            </p>

          </div>


          <div className="icare-table-actions">

            <div className="icare-record-count">
              {filteredIcareData.length} Records
            </div>

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

              {filteredIcareData.length ===
              0 ? (

                <tr>

                  <td
                    colSpan="14"
                    className="icare-no-data"
                  >

                    <div className="icare-no-data-icon">
                      👥
                    </div>

                    <strong>
                      No ICARE registration records
                    </strong>

                    <p>
                      Registered employees will appear here.
                    </p>

                  </td>

                </tr>

              ) : (

                filteredIcareData.map(
                  (
                    record,
                    index
                  ) => {

                    const status =
                      String(
                        getValue(
                          record,
                          "registrationStatus"
                        ) || ""
                      ).toUpperCase();

                    const completed =
                      status ===
                        "COMPLETED" ||
                      status ===
                        "REGISTERED";

                    const pcu =
                      String(
                        getValue(
                          record,
                          "pcu"
                        ) || ""
                      ).toUpperCase();

                    const fpe =
                      getValue(
                        record,
                        "fpe"
                      ) ||
                      getValue(
                        record,
                        "FPE"
                      );

                    return (

                      <tr
                        key={
                          record.id ||
                          `${index}-${getValue(
                            record,
                            "lastName"
                          )}`
                        }
                      >

                        <td>
                          {getValue(
                            record,
                            "company"
                          ) ||
                            "ICARE"}
                        </td>

                        <td>
                          {getValue(
                            record,
                            "no"
                          ) ||
                            index +
                              1}
                        </td>

                        <td className="philhealth-cell">
                          {getValue(
                            record,
                            "philhealthNo"
                          ) ||
                            "—"}
                        </td>

                        <td className="name-cell">
                          {getValue(
                            record,
                            "lastName"
                          ) ||
                            "—"}
                        </td>

                        <td className="name-cell">
                          {getValue(
                            record,
                            "firstName"
                          ) ||
                            "—"}
                        </td>

                        <td>
                          {getValue(
                            record,
                            "middleName"
                          ) ||
                            "—"}
                        </td>

                        <td>
                          {getValue(
                            record,
                            "dateOfBirth"
                          ) ||
                            "—"}
                        </td>

                        <td className="address-cell">
                          {getValue(
                            record,
                            "address"
                          ) ||
                            "—"}
                        </td>

                        <td>

                          <span
                            className={`pcu-badge ${
                              pcu ===
                              "YES"
                                ? "pcu-yes"
                                : pcu ===
                                  "NO"
                                ? "pcu-no"
                                : ""
                            }`}
                          >
                            {pcu ||
                              "—"}
                          </span>

                        </td>

                        <td>

                          <span
                            className={
                              completed
                                ? "icare-status registered"
                                : "icare-status pending"
                            }
                          >
                            {status ||
                              "PENDING"}
                          </span>

                        </td>

                        <td>
                          {getValue(
                            record,
                            "dateRegistered"
                          ) ||
                            "—"}
                        </td>

                        <td>

                          <span
                            className={`fpe-badge ${
                              fpe ===
                              "1st Tranch"
                                ? "fpe-tranch"
                                : String(
                                    fpe ||
                                      ""
                                  ).toUpperCase() ===
                                  "COMPLETED"
                                ? "fpe-completed"
                                : ""
                            }`}
                          >
                            {fpe ||
                              "—"}
                          </span>

                        </td>

                        <td className="remarks-cell">
                          {getValue(
                            record,
                            "remarks"
                          ) ||
                            "—"}
                        </td>

                        <td>

                          {record.id ? (

                            <div className="patient-action-buttons">

                              <button
                                type="button"
                                className="edit-patient-button"
                                onClick={() =>
                                  handleEditPatient(
                                    record
                                  )
                                }
                                title="Edit Patient"
                              >
                                ✎
                              </button>

                              <button
                                type="button"
                                className="delete-patient-button"
                                onClick={() =>
                                  handleDeletePatient(
                                    record
                                  )
                                }
                                title="Delete Patient"
                              >
                                🗑
                              </button>

                            </div>

                          ) : (

                            <span className="no-action">
                              —
                            </span>

                          )}

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
            {/* =====================================================
          ADD / EDIT PATIENT MODAL
      ===================================================== */}

      {showAddPatient && (

        <div
          className="add-patient-modal"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              handleCloseModal();
            }

          }}
        >

          <div className="add-patient-modal-content">

            <div className="add-patient-header">

              <div>

                <h2>
                  {editingPatient
                    ? "Edit Patient"
                    : "Add New Patient"}
                </h2>

                <p>
                  {editingPatient
                    ? "Update employee registration record"
                    : "Create employee registration record"}
                </p>

              </div>

              <button
                type="button"
                className="add-patient-close"
                onClick={
                  handleCloseModal
                }
              >
                ×
              </button>

            </div>


            <form
              className="add-patient-form"
              onSubmit={
                handleSavePatient
              }
            >

              {/* =================================================
                  PERSONAL INFORMATION
              ================================================= */}

              <section className="add-patient-section">

                <div className="add-patient-section-header">

                  <div className="add-patient-section-number">
                    01
                  </div>

                  <div>

                    <h3>
                      Personal Information
                    </h3>

                    <p>
                      Employee basic details
                    </p>

                  </div>

                </div>


                <div className="add-patient-grid">

                  <div className="add-patient-field">

                    <label>
                      LAST NAME
                      <span>
                        *
                      </span>
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
                      placeholder="Enter last name"
                      required
                    />

                  </div>


                  <div className="add-patient-field">

                    <label>
                      FIRST NAME
                      <span>
                        *
                      </span>
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
                      placeholder="Enter first name"
                      required
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
                      placeholder="Enter middle name"
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
                        newPatient.dateOfBirth
                      }
                      onChange={
                        handleInputChange
                      }
                    />

                  </div>

                </div>

              </section>


              {/* =================================================
                  REGISTRATION INFORMATION
              ================================================= */}

              <section className="add-patient-section">

                <div className="add-patient-section-header">

                  <div className="add-patient-section-number">
                    02
                  </div>

                  <div>

                    <h3>
                      Registration Information
                    </h3>

                    <p>
                      PhilHealth and registration details
                    </p>

                  </div>

                </div>


                <div className="add-patient-grid">

                  <div className="add-patient-field">

                    <label>
                      COMPANY
                    </label>

                    <input
                      type="text"
                      name="company"
                      value={
                        newPatient.company
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Enter company"
                    />

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
                      placeholder="Employee number"
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
                      placeholder="Enter PhilHealth number"
                    />

                  </div>


                  <div className="add-patient-field full-width">

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
                      placeholder="Enter complete address"
                    />

                  </div>


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
                        Select PCU
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
                        newPatient.dateRegistered
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
                        Select FPE
                      </option>

                      <option value="1st Tranch">
                        1st Tranch
                      </option>

                      <option value="COMPLETED">
                        COMPLETED
                      </option>

                    </select>

                  </div>


                  <div className="add-patient-field full-width">

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
                      placeholder="Enter remarks"
                    />

                  </div>

                </div>

              </section>


              {/* =================================================
                  FOOTER
              ================================================= */}

              <div className="add-patient-footer">

                <button
                  type="button"
                  className="add-patient-cancel"
                  onClick={
                    handleCloseModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="add-patient-save"
                >
                  {editingPatient
                    ? "Save Changes"
                    : "Add Patient"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          ADD COMPANY MODAL
          
          ADDED ONLY FOR COMPANY MANAGEMENT
      ===================================================== */}

      {showAddCompany && (

        <div
          className="add-patient-modal"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              handleCloseAddCompany();
            }

          }}
        >

          <div
            className="add-patient-modal-content"
            style={{
              width:
                "min(500px, 100%)",
            }}
          >

            <div className="add-patient-header">

              <div>

                <h2>
                  Add Company
                </h2>

                <p>
                  Create a company for YAKAP records
                </p>

              </div>

              <button
                type="button"
                className="add-patient-close"
                onClick={
                  handleCloseAddCompany
                }
              >
                ×
              </button>

            </div>


            <form
              className="add-patient-form"
              onSubmit={
                handleSaveCompany
              }
            >

              <section
                className="add-patient-section"
                style={{
                  marginBottom:
                    "0",
                }}
              >

                <div className="add-patient-section-header">

                  <div className="add-patient-section-number">
                    +
                  </div>

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

                  <div className="add-patient-field full-width">

                    <label>
                      COMPANY NAME
                      <span>
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      value={
                        newCompanyName
                      }
                      onChange={(
                        e
                      ) =>
                        setNewCompanyName(
                          e.target
                            .value
                        )
                      }
                      placeholder="Enter company name"
                      autoFocus
                      required
                    />

                  </div>

                </div>

              </section>


              <div className="add-patient-footer">

                <button
                  type="button"
                  className="add-patient-cancel"
                  onClick={
                    handleCloseAddCompany
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="add-patient-save"
                >
                  ＋ Add Company
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default IcareRegistration;