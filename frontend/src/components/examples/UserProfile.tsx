import UserProfile from "../UserProfile";
import { mockUsers } from "@/lib/mock-data";

export default function UserProfileExample() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <UserProfile user={mockUsers[0]} />
    </div>
  );
}
