import { useEffect } from "react";
import useAuth from "@/utils/useAuth";

function LogoutPage() {
  const { signOut } = useAuth();

  useEffect(() => {
    signOut({ callbackUrl: "/", redirect: true });
  }, [signOut]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-xl font-medium text-gray-900">
          Signing you out...
        </h1>
      </div>
    </div>
  );
}

export default LogoutPage;
