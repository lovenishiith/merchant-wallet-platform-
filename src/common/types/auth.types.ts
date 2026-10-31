export type JwtUserRole = "merchant" | "customer";

export type AuthenticatedUser = {
  userId: string;
  role: JwtUserRole;
};