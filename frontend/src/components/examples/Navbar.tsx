import Navbar from "../Navbar";
import { AuthProvider } from "@/lib/auth-context";

export default function NavbarExample() {
  return (
    <AuthProvider>
      <Navbar />
    </AuthProvider>
  );
}
