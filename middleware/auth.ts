// middleware/auth.ts
export default defineNuxtRouteMiddleware(async () => {
  const { data, error } = await useFetch("/api/auth/me", {
    headers: useRequestHeaders(["cookie"]),
    server: true,
  });
  if (error.value) {
    return navigateTo("/");
  }
  const user = useState("user");
  user.value = data.value?.data?.user;
});
