import { redirect } from "next/navigation";

/** Old address. Books, music, stories and blogs now live together. */
export default function BooksAndMusicRedirect() {
  redirect("/support/read-and-listen");
}
