export async function GET() {
  const hasSecret = Boolean(process.env.AUTH_SECRET);
  return Response.json({
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
    email: hasSecret,
    emailDelivery: process.env.AUTH_RESEND_KEY ? "resend" : "link",
    publicSignup: process.env.AUTH_PUBLIC_SIGNUP === "true",
    hasSecret,
  });
}
