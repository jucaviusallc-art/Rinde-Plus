import { supabase } from "./supabase";

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function loginUser(
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    throw new Error(error.message);
  }
}