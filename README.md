# 🔒 Anonymous Therapy Session Logger

Welcome to a privacy-first blockchain solution for mental health tracking! This project enables users to anonymously log therapy sessions on the Stacks blockchain, providing verifiable proof of progress without revealing personal identities. Therapists and patients can collaborate securely, with immutable records that support insurance claims, personal milestones, or employer verifications—all while maintaining anonymity through pseudonymous addresses and hashed data.

## ✨ Features

- 🕵️‍♂️ Fully anonymous logging: Use blockchain addresses as pseudonyms—no real names or IDs required.
- 📅 Immutable session records: Timestamped logs of therapy sessions with hashed notes for privacy.
- 📈 Verifiable progress tracking: Generate proofs of completed sessions or milestones without exposing details.
- 👥 Therapist-patient matching: Secure, anonymous pairing for ongoing therapy.
- 🔍 Third-party verification: Allow insurers or employers to verify progress via zero-knowledge-like checks (using hashes and timestamps).
- 🚫 Dispute resolution: Built-in mechanisms to handle session disputes anonymously.
- 🔐 Data encryption support: Store encrypted session summaries that only authorized parties can access off-chain.
- 📊 Analytics dashboard (off-chain integration): Aggregate anonymized data for research without compromising privacy.

## 🛠 How It Works

This project is built using Clarity smart contracts on the Stacks blockchain, leveraging its security anchored to Bitcoin. The system involves 8 interconnected smart contracts to handle different aspects of anonymity, logging, verification, and governance.

### Core Architecture
The project is modular, with contracts interacting via traits and public functions. Here's an overview of the 8 smart contracts:

1. **UserRegistry.clar**: Handles anonymous user registration. Users create pseudonymous profiles with a unique hash derived from their private data (never stored on-chain).
2. **TherapistRegistry.clar**: Allows therapists to register anonymously with verifiable credentials (e.g., hashed licenses). Includes a verification trait for cross-contract calls.
3. **SessionLogger.clar**: Core contract for logging sessions. Users submit hashed session notes, timestamps, and a session ID. Ensures immutability and prevents tampering.
4. **ProgressTracker.clar**: Tracks milestones like "completed 10 sessions" or "achieved goal X." Uses aggregated hashes to prove progress without revealing session details.
5. **VerificationContract.clar**: Provides functions to verify session existence or progress via hash matching. Supports third-party queries without exposing user data.
6. **PairingContract.clar**: Facilitates anonymous matching between patients and therapists. Uses blinded commitments to pair without revealing identities until both agree.
7. **DisputeResolver.clar**: Manages anonymous disputes over session validity. Relies on multi-signature-like voting from predefined arbitrators (anonymous).
8. **GovernanceContract.clar**: Oversees system updates, fee structures (if any), and trait definitions for interoperability between contracts.

### For Patients
- Register anonymously via `UserRegistry` by calling `register-user` with a unique hash.
- Find and pair with a therapist using `PairingContract`'s `request-pairing` function (blinded commitment).
- Log a session: Call `log-session` in `SessionLogger` with a SHA-256 hash of your notes, timestamp, and therapist confirmation hash.
- Track progress: Use `ProgressTracker` to mark milestones, generating a verifiable proof hash.

### For Therapists
- Register via `TherapistRegistry` with hashed credentials.
- Confirm pairings and sessions through cross-contract calls.
- Verify patient progress anonymously for reporting purposes.

### For Verifiers (e.g., Insurers)
- Query `VerificationContract` with a provided proof hash to confirm session counts or milestones.
- No access to underlying data—only boolean verifications or aggregate stats.

All interactions are gas-efficient and use Clarity's define-trait for secure contract composability. Off-chain, users can employ tools like IPFS for storing encrypted full notes, referenced by on-chain hashes.

## 🚀 Getting Started
1. Install the Stacks CLI and Clarity tools.
2. Deploy the contracts in order: Start with registries, then logger/tracker, and finally verification/governance.
3. Test on Stacks testnet: Use sample scripts in `/scripts` folder to simulate anonymous sessions.