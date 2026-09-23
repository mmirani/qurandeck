export async function GET() {
  return Response.json({
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
    email: Boolean(process.env.AUTH_RESEND_KEY),
    publicSignup: process.env.AUTH_PUBLIC_SIGNUP === "true",
    hasSecret: Boolean(process.env.AUTH_SECRET),
  });
}
