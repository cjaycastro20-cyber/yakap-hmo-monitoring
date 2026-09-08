import React, { useMemo, useState } from "react";

import "./CancelledDelivery.css";

const cleanString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const getPatientName = (patient) => {
  if (!patient) return "—";

  if (patient.patientName) {
    return cleanString(patient.patientName);
  }

  const lastName = cleanString(
    patient.lastName ??
      patient.lastname ??
      patient.last_name
  );

  const firstName = cleanString(
    patient.firstName ??
      patient.firstname ??
      patient.first_name
  );

  const middleName = cleanString(
    patient.middleName ??
      patient.middlename ??
      patient.middle_name
  );

  return [lastName, firstName, middleName]
    .filter(Boolean)
    .join(", ")
    .replace(", ,", ",") || "—";
};

const getPhilHealthNo = (patient) => {
  return (
    cleanString(
      patient?.philhealthNo ??
        patient?.philHealthNo ??
        patient?.philhealthNumber ??
        patient?.philhealth
    ) || "—"
  );
};

const getMedicineName = (patient, delivery) => {
  const medicines =
    delivery?.medicines ??
    delivery?.medicineList ??
    patient?.medicines ??
    [];

  if (Array.isArray(medicines)) {
    const names = medicines
      .map((medicine) => {
        if (typeof medicine === "string") {
          return cleanString(medicine);
        }

        return cleanString(
          medicine?.medicineName ??
            medicine?.name ??
            medicine?.medicine ??
            medicine?.description
        );
      })
      .filter(Boolean);

    if (names.length > 0) {
      return names.join(", ");
    }
  }

  return (
    cleanString(
      delivery?.medicineName ??
        delivery?.medicine ??
        patient?.medicineName ??
        patient?.medicine
    ) || "—"
  );
};

const getDeliveryMonth = (delivery, index) => {
  return (
    cleanString(
      delivery?.month ??
        delivery?.deliveryMonth ??
        delivery?.monthName ??
        delivery?.period
    ) ||
    `Month ${index + 1}`
  );
};

const getScheduledDate = (delivery) => {
  return (
    cleanString(
      delivery?.scheduledDate ??
        delivery?.deliveryDate ??
        delivery?.scheduleDate ??
        delivery?.date
    ) || "—"
  );
};

const getCancellationDate = (delivery) => {
  return (
    cleanString(
      delivery?.cancelledDate ??
        delivery?.canceledDate ??
        delivery?.actualDate ??
        delivery?.dateCancelled
    ) || "—"
  );
};

const getCancellationReason = (delivery) => {
  return (
    cleanString(
      delivery?.cancellationReason ??
        delivery?.cancelledReason ??
        delivery?.cancelReason ??
        delivery?.reason
    ) || "No reason provided"
  );
};

const formatDate = (value) => {
  if (!value || value === "—") return "—";

  if (typeof value === "object" && value?.seconds) {
    const date = new Date(value.seconds * 1000);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getSearchText = (record) => {
  const patient = record?.patient ?? {};
  const delivery = record?.delivery ?? {};

  return [
    getPatientName(patient),
    getPhilHealthNo(patient),
    getMedicineName(patient, delivery),
    getDeliveryMonth(delivery, record?.index ?? 0),
    getScheduledDate(delivery),
    getCancellationDate(delivery),
    getCancellationReason(delivery),
  ]
    .join(" ")
    .toLowerCase();
};

const CancelledDelivery = ({ records = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRecords = useMemo(() => {
    const search = cleanString(searchTerm).toLowerCase();

    if (!search) {
      return records;
    }

    return records.filter((record) =>
      getSearchText(record).includes(search)
    );
  }, [records, searchTerm]);

  return (
    <div className="cancelled-delivery-page">
      <div className="cancelled-delivery-heading">
        <div>
          <h1>Cancelled Delivery</h1>
          <p>
            History of medicines whose delivery was cancelled.
          </p>
        </div>

        <div className="cancelled-delivery-count">
          <span className="cancelled-delivery-count-number">
            {records.length}
          </span>
          <span className="cancelled-delivery-count-label">
            Cancelled
          </span>
        </div>
      </div>

      <div className="cancelled-delivery-panel">
        <div className="cancelled-delivery-toolbar">
          <div className="cancelled-delivery-search">
            <span className="cancelled-delivery-search-icon">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search patient, PhilHealth No., medicine..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />

            {searchTerm && (
              <button
                type="button"
                className="cancelled-delivery-clear"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="cancelled-delivery-result-count">
            {filteredRecords.length} record
            {filteredRecords.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="cancelled-delivery-table-wrapper">
          <table className="cancelled-delivery-table">
            <thead>
              <tr>
                <th>NO.</th>
                <th>PATIENT</th>
                <th>PHILHEALTH NO.</th>
                <th>MEDICINE</th>
                <th>DELIVERY MONTH</th>
                <th>SCHEDULED DATE</th>
                <th>CANCELLED DATE</th>
                <th>REASON</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="cancelled-delivery-empty"
                  >
                    <div className="cancelled-delivery-empty-icon">
                      ×
                    </div>

                    <strong>
                      {searchTerm
                        ? "No matching cancelled records"
                        : "No cancelled deliveries yet"}
                    </strong>

                    <span>
                      {searchTerm
                        ? "Try a different search term."
                        : "Cancelled records will appear here."}
                    </span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => {
                  const patient = record.patient ?? {};
                  const delivery = record.delivery ?? {};

                  return (
                    <tr
                      key={`${patient.id ?? patient.philhealthNo ?? index}-${record.index}-${index}`}
                    >
                      <td className="cancelled-delivery-number">
                        {index + 1}
                      </td>

                      <td>
                        <div className="cancelled-patient-cell">
                          <div className="cancelled-patient-avatar">
                            {getPatientName(patient)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {getPatientName(patient)}
                            </strong>

                            {patient.contactNumber && (
                              <small>
                                {cleanString(
                                  patient.contactNumber
                                )}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="cancelled-philhealth">
                          {getPhilHealthNo(patient)}
                        </span>
                      </td>

                      <td>
                        <div className="cancelled-medicine">
                          {getMedicineName(
                            patient,
                            delivery
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="cancelled-month">
                          {getDeliveryMonth(
                            delivery,
                            record.index ?? index
                          )}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          getScheduledDate(delivery)
                        )}
                      </td>

                      <td className="cancelled-date">
                        {formatDate(
                          getCancellationDate(delivery)
                        )}
                      </td>

                      <td>
                        <div className="cancelled-reason">
                          {getCancellationReason(
                            delivery
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="cancelled-status">
                          <span>×</span>
                          CANCELLED
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CancelledDelivery;