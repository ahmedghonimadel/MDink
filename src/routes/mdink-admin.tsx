import { createFileRoute, redirect } from "@tanstack/react-router";

// Private, memorable URL for MDink Solutions staff to reach the team login.
// Not exposed anywhere in the public navigation.
export const Route = createFileRoute("/mdink-admin")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
