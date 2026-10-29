import { Poppins } from "next/font/google";

/** Landing-page typeface. Exposed as the CSS variable `--font-poppins`. */
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
});
