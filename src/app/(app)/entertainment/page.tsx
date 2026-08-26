import { getEntertainmentVideos } from "@/app/actions/entertainment";
import { EntertainmentClient } from "./entertainment-client";

export const metadata = { title: "Quản lý giải trí — QLLH" };

export default async function EntertainmentPage() {
  return <EntertainmentClient initialVideos={await getEntertainmentVideos()} />;
}
