"use server";
import { removeAuthCookie, setAuthCookie, singAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/utils/sentry";
import bcrypt from "bcryptjs";

type ResponseResult = {
  success: boolean;
  message: string;
};

//Register new user
export async function registerUser(
  prevState: ResponseResult,
  formData: FormData,
): Promise<ResponseResult> {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
      logEvent(
        "Validation error: Missing register fields",
        "auth",
        { name, email },
        "warning",
      );

      return { success: false, message: "All fields are required" };
    }

    //check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logEvent(
        `Registration failed: User already exists - ${email}`,
        "auth",
        { email },
        "warning",
      );

      return { success: false, message: "User already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    //Sign and set auth token
    const token = await singAuthToken({ userId: user.id });
    await setAuthCookie(token);

    logEvent(
      `User registed successfully: ${email}`,
      "auth",
      { userId: user.id },
      "info",
    );

    return { success: true, message: "Registration successfull" };
  } catch (error) {
    logEvent(
      `unexpected error during registraiton`,
      "auth",
      {},
      "error",
      error,
    );

    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}

//Log user out and clear auth cookie
export async function logoutUser(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    removeAuthCookie();
    logEvent("user logout succesfully", "auth", {}, "info");

    return { success: true, message: "Logout successfully" };
  } catch (error) {
    console.log(error);
    logEvent("unexpected error during logout", "auth", {}, "error", error);

    return {
      success: false,
      message: "Logout failed, please try again",
    };
  }
}

// Log user in
export async function loginUser(
  prevState: ResponseResult,
  formData: FormData,
): Promise<ResponseResult> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      logEvent(
        "Validation errors: Missing login errors",
        "auth",
        { email },
        "warning",
      );
      return {
        success: false,
        message: "All email and password are required",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      logEvent(
        `Login Failed: User not found - #{email}`,
        "auth",
        { email },
        "warning",
      );

      return { success: false, message: "Invalid email or password" };
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logEvent(
        `Login Failed: Incorrect passsword`,
        "auth",
        { email },
        "warning",
      );

      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    //create token
    const token = await singAuthToken({ userId: user.id });
    await setAuthCookie(token);

    return { success: true, message: "Login successfully" };
  } catch (error) {
    logEvent(`Login Failed: Incorrect passsword`, "auth", {}, "error", error);

    return { success: false, message: "Error during login" };
  }
}
