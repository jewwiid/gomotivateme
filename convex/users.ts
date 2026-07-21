// @ts-nocheck — see convex/goals.ts header.
/**
 * User-facing queries. Convex Auth manages the actual user records.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";