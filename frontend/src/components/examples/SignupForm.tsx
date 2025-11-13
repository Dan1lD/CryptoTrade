import SignupForm from "../SignupForm";
import { AuthProvider } from "@/lib/auth-context";

export default function SignupFormExample() {
  return (
    <AuthProvider>
      <div className="max-w-md mx-auto p-8">
        <SignupForm onSwitchToLogin={() => console.log("Switch to login")} />
      </div>
    </AuthProvider>
  );
}
