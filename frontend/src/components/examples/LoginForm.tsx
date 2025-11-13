import LoginForm from "../LoginForm";
import { AuthProvider } from "@/lib/auth-context";

export default function LoginFormExample() {
  return (
    <AuthProvider>
      <div className="max-w-md mx-auto p-8">
        <LoginForm onSwitchToSignup={() => console.log("Switch to signup")} />
      </div>
    </AuthProvider>
  );
}
