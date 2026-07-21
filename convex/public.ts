// @ts-nocheck — see convex/goals.ts header.
/**
 * Public read paths — used by the unauthenticated /o/[slug] page.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { computeProgress, daysUntil } from "./utils";