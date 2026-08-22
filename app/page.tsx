import { redirect } from "next/navigation";
import { serverSession } from "@/lib/server-api";

export default async function Home() {
  const session = await serverSession();
  redirect(
    !session
      ? "/login"
      : session.authentication_assurance === "strong"
        ? "/app/projects"
        : "/setup-security",
  );
}
