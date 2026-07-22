/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as badges from "../badges.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as emailsActions from "../emailsActions.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as moderation from "../moderation.js";
import type * as motivation from "../motivation.js";
import type * as notificationPrefs from "../notificationPrefs.js";
import type * as public_ from "../public.js";
import type * as reactions from "../reactions.js";
import type * as reports from "../reports.js";
import type * as storage from "../storage.js";
import type * as supportMessages from "../supportMessages.js";
import type * as supporters from "../supporters.js";
import type * as updates from "../updates.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  badges: typeof badges;
  crons: typeof crons;
  emails: typeof emails;
  emailsActions: typeof emailsActions;
  goals: typeof goals;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  moderation: typeof moderation;
  motivation: typeof motivation;
  notificationPrefs: typeof notificationPrefs;
  public: typeof public_;
  reactions: typeof reactions;
  reports: typeof reports;
  storage: typeof storage;
  supportMessages: typeof supportMessages;
  supporters: typeof supporters;
  updates: typeof updates;
  users: typeof users;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
