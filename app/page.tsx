import { redirect } from "next/navigation";
import { serverSession } from "@/lib/server-api";

export default async function Home() {
  redirect((await serverSession()) ? "/app/projects" : "/login");
}
