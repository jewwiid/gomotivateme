// @ts-nocheck — see convex/goals.ts header.
/**
 * Badges — milestone awards (25%, 50%, 75%, 100%).
 * These are written by `goals.recordValue`; this file exposes read paths.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";