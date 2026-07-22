export default {
  // Convex Auth issues JWTs from this deployment's `.convex.site` URL
  // with `aud: "convex"`. Convex uses this list to validate those JWTs
  // before allowing authenticated queries and mutations. Without this
  // provider, password sign-in appears to succeed but every subsequent
  // authenticated request is treated as signed out.
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
