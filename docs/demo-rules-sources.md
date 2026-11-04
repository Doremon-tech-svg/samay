# SAMAY demo rules and source notes

This file records the sources used by the judge walkthrough. The photo-verification layer is a deterministic demo proxy; it does not call DigiLocker or verify a government record.

## Gujarat — Income Certificate

The Government of Gujarat Department of Science and Technology describes Digital Gujarat, Jan Seva Kendra, Seva Setu, and Digital Seva Setu as channels for citizen services including Income Certificate. The uploaded Gujarat receipt supplies the demo receipt date and expected date, so the demo rule uses the 14-day window printed on that receipt. The current notified-service SLA should be rechecked with the relevant Gujarat notification before any real deployment.

Source: https://dst.gujarat.gov.in/Home/ProjectsandInitiatives

## Tamil Nadu — Community Certificate

The Government of Tamil Nadu Information Technology Department lists **REV-101 Community Certificate** under the Revenue department and records a ₹60 service charge. The uploaded receipt supplies the 15-day expected-date window used in the judge demo.

Source: https://it.tn.gov.in/en/List_of_services_offered_in_e-sevai_centres

## Maharashtra — Caste Certificate

The official Aaple Sarkar service page confirms that notified services have stipulated delivery periods and a right of appeal for delay or wrongful rejection. The official Maharashtra RTS page describes the first-appeal, second-appeal, and final State Commission structure. The demo registry uses the receipt’s 15-day expected-date window for the supplied specimen and keeps the source note visible for review.

Sources:

- https://aaplesarkar.mahaonline.gov.in/en/Login/Certificate_Documents?ServiceId=1284
- https://aaplesarkar.mahaonline.gov.in/en/CommonForm/RigthToServiceAct

## Uttar Pradesh — Income Certificate

The official eDistrict Uttar Pradesh service document lists Income Certificate under the Revenue Department, specifies a **20-day SLA**, identifies Tehsildar verification and Lekhpal inspection, and lists a ₹15 user charge. The uploaded receipt is intentionally rejected by the demo proxy because its printed 15-day expectation does not match the official 20-day service document.

Source: https://edistrict.up.gov.in/eDistrictup/Services/new_online_service_pdf/Income_Certificate.pdf

## Demo safety rule

Only three specimens are accepted by the proxy: Gujarat, Tamil Nadu, and Maharashtra. The Uttar Pradesh specimen is retained as a negative test. Any other uploaded file is routed to the existing AI/local-OCR fallback and is not treated as government-verified.
