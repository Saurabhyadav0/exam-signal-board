// Matches the site's own design tokens (see app/globals.css) so Clerk's
// widgets don't look like a bolted-on third-party redirect.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#b96e17",
    colorText: "#1b1d1a",
    colorTextSecondary: "#5b5f58",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#1b1d1a",
    borderRadius: "10px",
    fontFamily: "'Public Sans', -apple-system, sans-serif",
  },
  elements: {
    card: { boxShadow: "none", border: "1.5px solid #d3cebd", borderRadius: "14px" },
    headerTitle: { fontFamily: "'Big Shoulders', sans-serif", textTransform: "uppercase" as const },
    formButtonPrimary: {
      backgroundColor: "#b96e17",
      fontSize: "14.5px",
      textTransform: "none" as const,
      "&:hover": { backgroundColor: "#a3620f" },
    },
    footerActionLink: { color: "#2e7a72" },
  },
};
