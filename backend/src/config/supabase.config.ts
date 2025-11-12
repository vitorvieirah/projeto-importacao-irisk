export default () => ({
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  },
});