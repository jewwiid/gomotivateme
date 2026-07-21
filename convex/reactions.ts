// @ts-nocheck — see convex/goals.ts header.
/**
 * Public reactions — thumbs-up and messages.
 * All public, no auth needed. Messages default to pending; owner approves.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";