import { redirect } from "next/navigation";

/**
 * Root page — redirect to login.
 * After login, the server determines whether to route to
 * the employee dashboard or admin panel based on the JWT role.
 */
export default function HomePage() {
  redirect("/login");
}
