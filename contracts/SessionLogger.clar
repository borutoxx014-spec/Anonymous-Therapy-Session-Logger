(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-SESSION-ID u101)
(define-constant ERR-INVALID-HASH u102)
(define-constant ERR-INVALID-TIMESTAMP u103)
(define-constant ERR-INVALID-PATIENT u104)
(define-constant ERR-INVALID-THERAPIST u105)
(define-constant ERR-SESSION-ALREADY-EXISTS u106)
(define-constant ERR-SESSION-NOT-FOUND u107)
(define-constant ERR-INVALID-DURATION u108)
(define-constant ERR-INVALID-STATUS u109)
(define-constant ERR-INVALID-NOTES-HASH u110)
(define-constant ERR-INVALID-CONFIRMATION-HASH u111)
(define-constant ERR-CONFIRMATION-MISMATCH u112)
(define-constant ERR-SESSION-EXPIRED u113)
(define-constant ERR-INVALID-PROGRESS-MILESTONE u114)
(define-constant ERR-MAX-SESSIONS-EXCEEDED u115)
(define-constant ERR-INVALID-SESSION-TYPE u116)
(define-constant ERR-INVALID-PRIVACY-LEVEL u117)
(define-constant ERR-INVALID-LOCATION-HASH u118)
(define-constant ERR-INVALID-DEVICE-ID u119)
(define-constant ERR-INVALID-SIGNATURE u120)

(define-data-var next-session-id uint u0)
(define-data-var max-sessions uint u10000)
(define-data-var logging-fee uint u100)
(define-data-var admin-principal principal tx-sender)

(define-map sessions
  uint
  {
    patient: principal,
    therapist: principal,
    notes-hash: (buff 32),
    timestamp: uint,
    duration: uint,
    status: bool,
    confirmation-hash: (buff 32),
    session-type: (string-utf8 50),
    privacy-level: uint,
    location-hash: (buff 32),
    device-id: (buff 32),
    signature: (buff 65)
  }
)

(define-map sessions-by-patient
  principal
  (list 100 uint))

(define-map sessions-by-therapist
  principal
  (list 100 uint))

(define-map session-progress
  uint
  {
    milestone: uint,
    progress-notes-hash: (buff 32),
    update-timestamp: uint
  }
)

(define-read-only (get-session (id uint))
  (map-get? sessions id)
)

(define-read-only (get-session-progress (id uint))
  (map-get? session-progress id)
)

(define-read-only (get-sessions-by-patient (patient principal))
  (default-to (list) (map-get? sessions-by-patient patient))
)

(define-read-only (get-sessions-by-therapist (therapist principal))
  (default-to (list) (map-get? sessions-by-therapist therapist))
)

(define-read-only (is-session-registered (id uint))
  (is-some (map-get? sessions id))
)

(define-private (validate-session-id (id uint))
  (ok true)
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p tx-sender))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-private (validate-duration (dur uint))
  (if (and (> dur u0) (<= dur u360))
      (ok true)
      (err ERR-INVALID-DURATION))
)

(define-private (validate-status (stat bool))
  (ok true)
)

(define-private (validate-session-type (typ (string-utf8 50)))
  (if (or (is-eq typ "individual") (is-eq typ "group") (is-eq typ "online"))
      (ok true)
      (err ERR-INVALID-SESSION-TYPE))
)

(define-private (validate-privacy-level (level uint))
  (if (<= level u5)
      (ok true)
      (err ERR-INVALID-PRIVACY-LEVEL))
)

(define-private (validate-location-hash (loc (buff 32)))
  (if (is-eq (len loc) u32)
      (ok true)
      (err ERR-INVALID-LOCATION-HASH))
)

(define-private (validate-device-id (dev (buff 32)))
  (if (is-eq (len dev) u32)
      (ok true)
      (err ERR-INVALID-DEVICE-ID))
)

(define-private (validate-signature (sig (buff 65)))
  (if (is-eq (len sig) u65)
      (ok true)
      (err ERR-INVALID-SIGNATURE))
)

(define-private (validate-milestone (mile uint))
  (if (> mile u0)
      (ok true)
      (err ERR-INVALID-PROGRESS-MILESTONE))
)

(define-public (set-admin-principal (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (var-set admin-principal new-admin)
    (ok true)
  )
)

(define-public (set-max-sessions (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-max u0) (err ERR-MAX-SESSIONS-EXCEEDED))
    (var-set max-sessions new-max)
    (ok true)
  )
)

(define-public (set-logging-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (var-set logging-fee new-fee)
    (ok true)
  )
)

(define-public (log-session
  (notes-hash (buff 32))
  (duration uint)
  (session-type (string-utf8 50))
  (privacy-level uint)
  (location-hash (buff 32))
  (device-id (buff 32))
  (signature (buff 65))
  (therapist principal)
)
  (let (
        (next-id (var-get next-session-id))
        (current-max (var-get max-sessions))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-SESSIONS-EXCEEDED))
    (try! (validate-hash notes-hash))
    (try! (validate-duration duration))
    (try! (validate-session-type session-type))
    (try! (validate-privacy-level privacy-level))
    (try! (validate-location-hash location-hash))
    (try! (validate-device-id device-id))
    (try! (validate-signature signature))
    (try! (validate-principal therapist))
    (try! (stx-transfer? (var-get logging-fee) tx-sender (var-get admin-principal)))
    (map-set sessions next-id
      {
        patient: tx-sender,
        therapist: therapist,
        notes-hash: notes-hash,
        timestamp: block-height,
        duration: duration,
        status: false,
        confirmation-hash: 0x,
        session-type: session-type,
        privacy-level: privacy-level,
        location-hash: location-hash,
        device-id: device-id,
        signature: signature
      }
    )
    (map-set sessions-by-patient tx-sender
      (unwrap! (as-max-len? (append (get-sessions-by-patient tx-sender) next-id) u100) (err ERR-MAX-SESSIONS-EXCEEDED))
    )
    (map-set sessions-by-therapist therapist
      (unwrap! (as-max-len? (append (get-sessions-by-therapist therapist) next-id) u100) (err ERR-MAX-SESSIONS-EXCEEDED))
    )
    (var-set next-session-id (+ next-id u1))
    (print { event: "session-logged", id: next-id })
    (ok next-id)
  )
)

(define-public (confirm-session
  (session-id uint)
  (confirmation-hash (buff 32))
)
  (let ((session (map-get? sessions session-id)))
    (match session
      s
        (begin
          (asserts! (is-eq tx-sender (get therapist s)) (err ERR-NOT-AUTHORIZED))
          (asserts! (not (get status s)) (err ERR-INVALID-STATUS))
          (try! (validate-hash confirmation-hash))
          (map-set sessions session-id
            (merge s { status: true, confirmation-hash: confirmation-hash })
          )
          (print { event: "session-confirmed", id: session-id })
          (ok true)
        )
      (err ERR-SESSION-NOT-FOUND)
    )
  )
)

(define-public (update-session-progress
  (session-id uint)
  (milestone uint)
  (progress-notes-hash (buff 32))
)
  (let ((session (map-get? sessions session-id)))
    (match session
      s
        (begin
          (asserts! (or (is-eq tx-sender (get patient s)) (is-eq tx-sender (get therapist s))) (err ERR-NOT-AUTHORIZED))
          (asserts! (get status s) (err ERR-INVALID-STATUS))
          (try! (validate-milestone milestone))
          (try! (validate-hash progress-notes-hash))
          (map-set session-progress session-id
            {
              milestone: milestone,
              progress-notes-hash: progress-notes-hash,
              update-timestamp: block-height
            }
          )
          (print { event: "progress-updated", id: session-id })
          (ok true)
        )
      (err ERR-SESSION-NOT-FOUND)
    )
  )
)

(define-public (verify-session (session-id uint) (provided-hash (buff 32)))
  (let ((session (map-get? sessions session-id)))
    (match session
      s
        (if (and (get status s) (is-eq (get notes-hash s) provided-hash))
            (ok true)
            (err ERR-CONFIRMATION-MISMATCH)
        )
      (err ERR-SESSION-NOT-FOUND)
    )
  )
)

(define-public (get-session-count)
  (ok (var-get next-session-id))
)