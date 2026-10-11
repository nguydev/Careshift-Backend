// pushNotification.ts
import admin from "firebase-admin";

import { readFileSync } from "fs";

import ApiError from "../../../errors/ApiError";
import {
  FIREBASE_SERVICE_ACCOUNT_PATH,
  ONE_SIGNAL_APP_ID,
  ONE_SIGNAL_REST_API_KEY,
} from "../../../config";

// Read and parse the Firebase service account JSON file
const serviceAccountBuffer = readFileSync(
  FIREBASE_SERVICE_ACCOUNT_PATH,
  "utf8"
);
const serviceAccount = JSON.parse(serviceAccountBuffer);
interface INotificationPayload {
  title: string;
  body: string;
}
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const sendPushNotification = async (
  fcmToken: string,
  payload: INotificationPayload
): Promise<string> => {
  const message = {
    token: fcmToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
  };
  console.log(message, "message");
  try {
    const response = await admin.messaging().send(message);
    console.log("Push notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw new ApiError(500, "Error sending push notification");
  }
};

export const sendPushNotificationToMultiple = async (
  tokens: string[],
  payload: INotificationPayload
): Promise<admin.messaging.BatchResponse> => {
  try {
    // Filter out invalid tokens
    let query: any = {};

    const validTokens = tokens.filter((token) => !!token);

    if (validTokens.length === 0) {
      console.log("No valid tokens to send notifications to");
      return { responses: [], successCount: 0, failureCount: 0 };
    }

    // Create multicast message
    const message: admin.messaging.MulticastMessage = {
      tokens: validTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
    };

    // Send batch using Firebase optimized method
    const batchResponse = await admin.messaging().sendEachForMulticast(message);

    console.log(
      `Notifications sent: ${batchResponse.successCount} successful, ${batchResponse.failureCount} failed`
    );

    // Optional: Log individual errors
    // batchResponse.responses.forEach((resp, idx) => {
    //   if (!resp.success) {
    //     console.error(`Failed to send to ${validTokens[idx]}:`, resp.error);
    //   }
    // });
    return batchResponse;
  } catch (error) {
    console.error("Error sending push notifications:", error);
    throw error;
  }
};

export const sendPushNotificationOneSignal = async (
  playerIds: string[],
  payload: { title: string; body: string }
): Promise<any> => {
  // Postman Demo for Sending OneSignal Push Notifications
  // ------------------------------------------------------->
  // {
  // "app_id": "b57562d8-42a1-4d60-9751-a4040b8b46ab",
  // "include_player_ids": ["your-player-id-here"],--------> id must be send in array format
  // "headings": { "en": "Notification Title" },
  // "contents": { "en": "This is the notification message." }
  // }
  // <------------------------------------------------------
  const notification = {
    app_id: ONE_SIGNAL_APP_ID,
    include_player_ids: playerIds,
    headings: { en: payload.title },
    contents: { en: payload.body },
  };
  console.log(notification, "------------> one signal payload notification");
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const data = await response.json();
    // console.log(data.response, "----------->one_signal push notification");
    if (!response.ok) {
      console.error("OneSignal API error:", data);
      throw new Error(`OneSignal API error: ${JSON.stringify(data)}`);
    }

    console.log("OneSignal push notification sent successfully:", data);
    return data;
  } catch (error: any) {
    console.error("Error sending push notification via OneSignal:", error);
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Error sending push notification via OneSignal"
    );
  }
};
