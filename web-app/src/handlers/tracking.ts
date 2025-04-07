import { KEY_STORAGE_USER_ID } from "@/constants/tracking";
import { v4 } from "uuid";

// Singleton way to track users in a anonymous fashion =)
export class TrackAnonymous {
  private storageKey;
  private static instance: TrackAnonymous | null = null;

  constructor() {
    if (!TrackAnonymous.instance) {
      TrackAnonymous.instance = this;
    }
    this.storageKey = KEY_STORAGE_USER_ID;

    return TrackAnonymous.instance;
  }

  private generateUserID() {
    const timestampPart = Date.now();
    const uid = v4();

    return `${uid}:${timestampPart}`;
  }

  public resetUserID() {
    localStorage.removeItem(this.storageKey);
    return true;
  }

  public getUserID() {
    // Try to get existing ID from localStorage
    let userID = localStorage.getItem(this.storageKey);

    // If no ID exists, create one and store it
    if (!userID) {
      userID = this.generateUserID();
      localStorage.setItem(this.storageKey, userID);
    }

    return userID;
  }
}

const Tracker = new TrackAnonymous();
Object.freeze(Tracker);
