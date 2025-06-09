<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>{{ isLogin ? 'Welcome back' : 'Create account' }}</CardTitle>
      <CardDescription>
        {{ isLogin ? 'Sign in to continue chatting' : 'Sign up to start chatting with AI' }}
      </CardDescription>
    </CardHeader>
    
    <CardContent>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <Label for="email">Email</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div>
          <Label for="password">Password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter your password"
            required
          />
        </div>
        
        <Button 
          type="submit" 
          class="w-full" 
          :disabled="loading"
        >
          <Icon v-if="loading" name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
          {{ isLogin ? 'Sign In' : 'Sign Up' }}
        </Button>
        
        <div v-if="error" class="text-sm text-destructive text-center">
          {{ error }}
        </div>
      </form>
    </CardContent>
    
    <CardFooter class="justify-center">
      <p class="text-sm text-muted-foreground">
        {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
        <button 
          @click="toggleMode" 
          class="text-primary hover:underline ml-1"
        >
          {{ isLogin ? 'Sign up' : 'Sign in' }}
        </button>
      </p>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
interface User {
  id: string
  email: string
}

const emit = defineEmits<{
  login: [user: User]
}>()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

function toggleMode() {
  isLogin.value = !isLogin.value
  error.value = ''
}

async function handleSubmit() {
  if (!email.value || !password.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    const endpoint = isLogin.value ? '/api/auth/login' : '/api/auth/register'
    const response = await $fetch(endpoint, {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })
    
    if (response.success) {
      emit('login', response.user)
    }
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Authentication failed'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Pre-fill demo credentials for easy testing
  email.value = 'demo@local.test'
  password.value = 'demo123'
})
</script> 