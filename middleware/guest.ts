export default defineNuxtRouteMiddleware(async (to, from) => {
  try {
    const { data } = await $fetch('/api/auth/me')
    
    if (data?.user) {
      return navigateTo('/')
    }
  } catch (error) {
    // User not logged in, allow access to login page
  }
}) 