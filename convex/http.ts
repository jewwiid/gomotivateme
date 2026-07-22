import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Exposes Convex Auth's OIDC discovery document and JWKS. Convex uses these
// endpoints to validate the session JWTs issued by this deployment.
auth.addHttpRoutes(http);

export default http;
