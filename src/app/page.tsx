import { HomeView } from "@/components/home/HomeView";
import { getUser } from "@/lib/auth";
import { getAccess, getSite } from "@/lib/site";

export default async function Home() {
  const [user, site, access] = await Promise.all([getUser(), getSite(), getAccess()]);
  return <HomeView site={site} loggedIn={!!user} signupOpen={access.allowSignup} />;
}
