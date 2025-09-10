;; Code Bounty Escrow Smart Contract
;; Manages bounties for development work with escrow functionality

(define-map bounties
  { bounty-id: uint }
  {
    creator: principal,
    amount: uint,
    title: (string-ascii 100),
    description: (string-ascii 500),
    requirements: (string-ascii 1000),
    deadline: uint,
    status: (string-ascii 20), ;; "open", "submitted", "completed", "cancelled"
    winner: (optional principal),
    submission-url: (optional (string-ascii 200)),
    created-at: uint
  }
)

(define-map submissions
  { bounty-id: uint, submitter: principal }
  {
    submission-url: (string-ascii 200),
    description: (string-ascii 500),
    submitted-at: uint,
    verified: bool
  }
)

(define-map verifiers
  { verifier: principal }
  { is-approved: bool }
)

(define-data-var next-bounty-id uint u1)
(define-data-var contract-owner principal tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-BOUNTY-NOT-FOUND (err u101))
(define-constant ERR-BOUNTY-NOT-OPEN (err u102))
(define-constant ERR-INSUFFICIENT-FUNDS (err u103))
(define-constant ERR-DEADLINE-PASSED (err u104))
(define-constant ERR-ALREADY-SUBMITTED (err u105))
(define-constant ERR-NOT-VERIFIER (err u106))
(define-constant ERR-SUBMISSION-NOT-FOUND (err u107))
(define-constant ERR-INVALID-STATUS (err u108))

;; Create a new bounty
(define-public (create-bounty 
  (amount uint) 
  (title (string-ascii 100)) 
  (description (string-ascii 500))
  (requirements (string-ascii 1000))
  (deadline uint))
  (let ((bounty-id (var-get next-bounty-id)))
    (asserts! (>= (stx-get-balance tx-sender) amount) ERR-INSUFFICIENT-FUNDS)
    (asserts! (> deadline stacks-block-height) ERR-DEADLINE-PASSED)
    
    ;; Transfer STX to contract as escrow
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Create bounty record
    (map-set bounties
      { bounty-id: bounty-id }
      {
        creator: tx-sender,
        amount: amount,
        title: title,
        description: description,
        requirements: requirements,
        deadline: deadline,
        status: "open",
        winner: none,
        submission-url: none,
        created-at: stacks-block-height
      }
    )
    
    ;; Increment bounty ID
    (var-set next-bounty-id (+ bounty-id u1))
    
    (ok bounty-id)
  )
)

;; Submit work for a bounty
(define-public (submit-work 
  (bounty-id uint) 
  (submission-url (string-ascii 200)) 
  (description (string-ascii 500)))
  (let ((bounty (unwrap! (map-get? bounties { bounty-id: bounty-id }) ERR-BOUNTY-NOT-FOUND)))
    (asserts! (is-eq (get status bounty) "open") ERR-BOUNTY-NOT-OPEN)
    (asserts! (< stacks-block-height (get deadline bounty)) ERR-DEADLINE-PASSED)
    (asserts! (is-none (map-get? submissions { bounty-id: bounty-id, submitter: tx-sender })) ERR-ALREADY-SUBMITTED)
    
    ;; Create submission record
    (map-set submissions
      { bounty-id: bounty-id, submitter: tx-sender }
      {
        submission-url: submission-url,
        description: description,
        submitted-at: stacks-block-height,
        verified: false
      }
    )
    
    ;; Update bounty status to submitted
    (map-set bounties
      { bounty-id: bounty-id }
      (merge bounty { status: "submitted" })
    )
    
    (ok true)
  )
)

;; Verify and approve a submission (only approved verifiers or bounty creator)
(define-public (verify-submission (bounty-id uint) (submitter principal))
  (let ((bounty (unwrap! (map-get? bounties { bounty-id: bounty-id }) ERR-BOUNTY-NOT-FOUND))
        (submission (unwrap! (map-get? submissions { bounty-id: bounty-id, submitter: submitter }) ERR-SUBMISSION-NOT-FOUND)))
    
    ;; Check if caller is authorized (bounty creator or approved verifier)
    (asserts! (or 
      (is-eq tx-sender (get creator bounty))
      (default-to false (get is-approved (map-get? verifiers { verifier: tx-sender })))
    ) ERR-NOT-AUTHORIZED)
    
    ;; Mark submission as verified
    (map-set submissions
      { bounty-id: bounty-id, submitter: submitter }
      (merge submission { verified: true })
    )
    
    ;; Release funds to winner
    (try! (as-contract (stx-transfer? (get amount bounty) tx-sender submitter)))
    
    ;; Update bounty status and winner
    (map-set bounties
      { bounty-id: bounty-id }
      (merge bounty { 
        status: "completed", 
        winner: (some submitter),
        submission-url: (some (get submission-url submission))
      })
    )
    
    (ok true)
  )
)

;; Cancel bounty and refund (only creator, before any submissions)
(define-public (cancel-bounty (bounty-id uint))
  (let ((bounty (unwrap! (map-get? bounties { bounty-id: bounty-id }) ERR-BOUNTY-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get creator bounty)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status bounty) "open") ERR-INVALID-STATUS)
    
    ;; Refund the bounty amount
    (try! (as-contract (stx-transfer? (get amount bounty) tx-sender (get creator bounty))))
    
    ;; Update status to cancelled
    (map-set bounties
      { bounty-id: bounty-id }
      (merge bounty { status: "cancelled" })
    )
    
    (ok true)
  )
)

;; Add approved verifier (only contract owner)
(define-public (add-verifier (verifier-address principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (map-set verifiers
      { verifier: verifier-address }
      { is-approved: true }
    )
    (ok true)
  )
)

;; Remove verifier (only contract owner)
(define-public (remove-verifier (verifier-address principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (map-set verifiers
      { verifier: verifier-address }
      { is-approved: false }
    )
    (ok true)
  )
)

;; Read-only functions

;; Get bounty details
(define-read-only (get-bounty (bounty-id uint))
  (map-get? bounties { bounty-id: bounty-id })
)

;; Get submission details
(define-read-only (get-submission (bounty-id uint) (submitter principal))
  (map-get? submissions { bounty-id: bounty-id, submitter: submitter })
)

;; Check if address is approved verifier
(define-read-only (is-verifier (address principal))
  (default-to false (get is-approved (map-get? verifiers { verifier: address })))
)

;; Get next bounty ID
(define-read-only (get-next-bounty-id)
  (var-get next-bounty-id)
)

;; Get contract owner
(define-read-only (get-contract-owner)
  (var-get contract-owner)
)

;; Get bounty count
(define-read-only (get-bounty-count)
  (- (var-get next-bounty-id) u1)
)