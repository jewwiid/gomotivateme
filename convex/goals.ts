// @ts-nocheck — stub `_generated/server.d.ts` types function builders as
// `any`, which propagates implicit any into ctx callbacks. The real
// `npx convex dev` codegen replaces this with strict types.
/**
 * Goal CRUD — authenticated owner-only.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { buildSlug, computeProgress, newMilestoneTiers } from "./utils";