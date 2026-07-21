// @ts-nocheck — see convex/goals.ts header.
/**
 * Progress updates — notes, images, links, values.
 * Value-type updates are written through `goals.recordValue` so badges stay in sync.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";