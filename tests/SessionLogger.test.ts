/** @format */

import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_SESSION_ID = 101;
const ERR_INVALID_HASH = 102;
const ERR_INVALID_TIMESTAMP = 103;
const ERR_INVALID_PATIENT = 104;
const ERR_INVALID_THERAPIST = 105;
const ERR_SESSION_ALREADY_EXISTS = 106;
const ERR_SESSION_NOT_FOUND = 107;
const ERR_INVALID_DURATION = 108;
const ERR_INVALID_STATUS = 109;
const ERR_INVALID_NOTES_HASH = 110;
const ERR_INVALID_CONFIRMATION_HASH = 111;
const ERR_CONFIRMATION_MISMATCH = 112;
const ERR_SESSION_EXPIRED = 113;
const ERR_INVALID_PROGRESS_MILESTONE = 114;
const ERR_MAX_SESSIONS_EXCEEDED = 115;
const ERR_INVALID_SESSION_TYPE = 116;
const ERR_INVALID_PRIVACY_LEVEL = 117;
const ERR_INVALID_LOCATION_HASH = 118;
const ERR_INVALID_DEVICE_ID = 119;
const ERR_INVALID_SIGNATURE = 120;

interface Session {
  patient: string;
  therapist: string;
  notesHash: Uint8Array;
  timestamp: number;
  duration: number;
  status: boolean;
  confirmationHash: Uint8Array;
  sessionType: string;
  privacyLevel: number;
  locationHash: Uint8Array;
  deviceId: Uint8Array;
  signature: Uint8Array;
}

interface SessionProgress {
  milestone: number;
  progressNotesHash: Uint8Array;
  updateTimestamp: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class SessionLoggerMock {
  state: {
    nextSessionId: number;
    maxSessions: number;
    loggingFee: number;
    adminPrincipal: string;
    sessions: Map<number, Session>;
    sessionsByPatient: Map<string, number[]>;
    sessionsByTherapist: Map<string, number[]>;
    sessionProgress: Map<number, SessionProgress>;
  } = {
    nextSessionId: 0,
    maxSessions: 10000,
    loggingFee: 100,
    adminPrincipal: "ST1ADMIN",
    sessions: new Map(),
    sessionsByPatient: new Map(),
    sessionsByTherapist: new Map(),
    sessionProgress: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1PATIENT";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextSessionId: 0,
      maxSessions: 10000,
      loggingFee: 100,
      adminPrincipal: "ST1ADMIN",
      sessions: new Map(),
      sessionsByPatient: new Map(),
      sessionsByTherapist: new Map(),
      sessionProgress: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1PATIENT";
    this.stxTransfers = [];
  }

  setAdminPrincipal(newAdmin: string): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.adminPrincipal = newAdmin;
    return { ok: true, value: true };
  }

  setMaxSessions(newMax: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newMax <= 0) return { ok: false, value: ERR_MAX_SESSIONS_EXCEEDED };
    this.state.maxSessions = newMax;
    return { ok: true, value: true };
  }

  setLoggingFee(newFee: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.loggingFee = newFee;
    return { ok: true, value: true };
  }

  logSession(
    notesHash: Uint8Array,
    duration: number,
    sessionType: string,
    privacyLevel: number,
    locationHash: Uint8Array,
    deviceId: Uint8Array,
    signature: Uint8Array,
    therapist: string
  ): Result<number> {
    if (this.state.nextSessionId >= this.state.maxSessions)
      return { ok: false, value: ERR_MAX_SESSIONS_EXCEEDED };
    if (notesHash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (duration <= 0 || duration > 360)
      return { ok: false, value: ERR_INVALID_DURATION };
    if (!["individual", "group", "online"].includes(sessionType))
      return { ok: false, value: ERR_INVALID_SESSION_TYPE };
    if (privacyLevel > 5)
      return { ok: false, value: ERR_INVALID_PRIVACY_LEVEL };
    if (locationHash.length !== 32)
      return { ok: false, value: ERR_INVALID_LOCATION_HASH };
    if (deviceId.length !== 32)
      return { ok: false, value: ERR_INVALID_DEVICE_ID };
    if (signature.length !== 65)
      return { ok: false, value: ERR_INVALID_SIGNATURE };
    if (therapist === this.caller)
      return { ok: false, value: ERR_NOT_AUTHORIZED };

    this.stxTransfers.push({
      amount: this.state.loggingFee,
      from: this.caller,
      to: this.state.adminPrincipal,
    });

    const id = this.state.nextSessionId;
    const session: Session = {
      patient: this.caller,
      therapist,
      notesHash,
      timestamp: this.blockHeight,
      duration,
      status: false,
      confirmationHash: new Uint8Array(0),
      sessionType,
      privacyLevel,
      locationHash,
      deviceId,
      signature,
    };
    this.state.sessions.set(id, session);
    const patientSessions = this.state.sessionsByPatient.get(this.caller) || [];
    if (patientSessions.length >= 100)
      return { ok: false, value: ERR_MAX_SESSIONS_EXCEEDED };
    patientSessions.push(id);
    this.state.sessionsByPatient.set(this.caller, patientSessions);
    const therapistSessions =
      this.state.sessionsByTherapist.get(therapist) || [];
    if (therapistSessions.length >= 100)
      return { ok: false, value: ERR_MAX_SESSIONS_EXCEEDED };
    therapistSessions.push(id);
    this.state.sessionsByTherapist.set(therapist, therapistSessions);
    this.state.nextSessionId++;
    return { ok: true, value: id };
  }

  confirmSession(id: number, confirmationHash: Uint8Array): Result<boolean> {
    const session = this.state.sessions.get(id);
    if (!session) return { ok: false, value: ERR_SESSION_NOT_FOUND };
    if (this.caller !== session.therapist)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (session.status) return { ok: false, value: ERR_INVALID_STATUS };
    if (confirmationHash.length !== 32)
      return { ok: false, value: ERR_INVALID_HASH };
    session.status = true;
    session.confirmationHash = confirmationHash;
    this.state.sessions.set(id, session);
    return { ok: true, value: true };
  }

  updateSessionProgress(
    id: number,
    milestone: number,
    progressNotesHash: Uint8Array
  ): Result<boolean> {
    const session = this.state.sessions.get(id);
    if (!session) return { ok: false, value: ERR_SESSION_NOT_FOUND };
    if (this.caller !== session.patient && this.caller !== session.therapist)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!session.status) return { ok: false, value: ERR_INVALID_STATUS };
    if (milestone <= 0)
      return { ok: false, value: ERR_INVALID_PROGRESS_MILESTONE };
    if (progressNotesHash.length !== 32)
      return { ok: false, value: ERR_INVALID_HASH };
    const progress: SessionProgress = {
      milestone,
      progressNotesHash,
      updateTimestamp: this.blockHeight,
    };
    this.state.sessionProgress.set(id, progress);
    return { ok: true, value: true };
  }

  verifySession(id: number, providedHash: Uint8Array): Result<boolean> {
    const session = this.state.sessions.get(id);
    if (!session) return { ok: false, value: ERR_SESSION_NOT_FOUND };
    if (!session.status || !this.arrayEquals(session.notesHash, providedHash))
      return { ok: false, value: ERR_CONFIRMATION_MISMATCH };
    return { ok: true, value: true };
  }

  getSessionCount(): Result<number> {
    return { ok: true, value: this.state.nextSessionId };
  }

  private arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
}

describe("SessionLogger", () => {
  let contract: SessionLoggerMock;

  beforeEach(() => {
    contract = new SessionLoggerMock();
    contract.reset();
  });

  it("logs a session successfully", () => {
    contract.caller = "ST1PATIENT";
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    const result = contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const session = contract.state.sessions.get(0);
    expect(session?.patient).toBe("ST1PATIENT");
    expect(session?.therapist).toBe("ST2THERAPIST");
    expect(session?.duration).toBe(60);
    expect(session?.sessionType).toBe("individual");
    expect(session?.privacyLevel).toBe(3);
    expect(session?.status).toBe(false);
    expect(contract.stxTransfers).toEqual([
      { amount: 100, from: "ST1PATIENT", to: "ST1ADMIN" },
    ]);
  });

  it("rejects logging with invalid duration", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    const result = contract.logSession(
      notesHash,
      0,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DURATION);
  });

  it("rejects logging with invalid session type", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    const result = contract.logSession(
      notesHash,
      60,
      "invalid",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SESSION_TYPE);
  });

  it("confirms a session successfully", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    contract.caller = "ST2THERAPIST";
    const confirmationHash = new Uint8Array(32).fill(5);
    const result = contract.confirmSession(0, confirmationHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const session = contract.state.sessions.get(0);
    expect(session?.status).toBe(true);
  });

  it("rejects confirmation by non-therapist", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    const confirmationHash = new Uint8Array(32).fill(5);
    const result = contract.confirmSession(0, confirmationHash);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("updates session progress successfully", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    contract.caller = "ST2THERAPIST";
    const confirmationHash = new Uint8Array(32).fill(5);
    contract.confirmSession(0, confirmationHash);
    contract.caller = "ST1PATIENT";
    const progressNotesHash = new Uint8Array(32).fill(6);
    const result = contract.updateSessionProgress(0, 1, progressNotesHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const progress = contract.state.sessionProgress.get(0);
    expect(progress?.milestone).toBe(1);
  });

  it("rejects progress update for unconfirmed session", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    const progressNotesHash = new Uint8Array(32).fill(6);
    const result = contract.updateSessionProgress(0, 1, progressNotesHash);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_STATUS);
  });

  it("verifies session successfully", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    contract.caller = "ST2THERAPIST";
    const confirmationHash = new Uint8Array(32).fill(5);
    contract.confirmSession(0, confirmationHash);
    const result = contract.verifySession(0, notesHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
  });

  it("rejects verification with mismatch hash", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    contract.caller = "ST2THERAPIST";
    const confirmationHash = new Uint8Array(32).fill(5);
    contract.confirmSession(0, confirmationHash);
    const wrongHash = new Uint8Array(32).fill(7);
    const result = contract.verifySession(0, wrongHash);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CONFIRMATION_MISMATCH);
  });

  it("sets logging fee successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setLoggingFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.loggingFee).toBe(200);
    contract.caller = "ST1PATIENT";
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    expect(contract.stxTransfers).toEqual([
      { amount: 200, from: "ST1PATIENT", to: "ST1ADMIN" },
    ]);
  });

  it("rejects max sessions exceeded", () => {
    contract.state.maxSessions = 1;
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    const result = contract.logSession(
      notesHash,
      90,
      "group",
      4,
      locationHash,
      deviceId,
      signature,
      "ST3THERAPIST"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_SESSIONS_EXCEEDED);
  });

  it("returns correct session count", () => {
    const notesHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const deviceId = new Uint8Array(32).fill(3);
    const signature = new Uint8Array(65).fill(4);
    contract.logSession(
      notesHash,
      60,
      "individual",
      3,
      locationHash,
      deviceId,
      signature,
      "ST2THERAPIST"
    );
    contract.logSession(
      notesHash,
      90,
      "group",
      4,
      locationHash,
      deviceId,
      signature,
      "ST3THERAPIST"
    );
    const result = contract.getSessionCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });


});