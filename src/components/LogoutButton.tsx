"use client";

import { logoutUser } from "@/actions/auth.actions";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

function LogoutButton() {
  const router = useRouter();

  const initialState = {
    success: false,
    message: "",
  };

  const [state, fromAction] = useActionState(logoutUser, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Logout successfull");
      router.push("/login");
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={fromAction}>
      <button
        type="submit"
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
      >
        Logout
      </button>
    </form>
  );
}

export default LogoutButton;
