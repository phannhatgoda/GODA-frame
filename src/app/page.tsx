import { HomeView } from "@/components/home/HomeView";
import { getUser } from "@/lib/auth";
import { getSite } from "@/lib/site";

export default async function Home() {
  const [user, site] = await Promise.all([getUser(), getSite()]);
  return <HomeView site={site} loggedIn={!!user} />;
}
