import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'

type RegisterForm = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formError, setFormError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>()

  const onSubmit = async (data: RegisterForm) => {
    setFormError('')
    if (data.password !== data.confirmPassword) {
      setFormError('Passwords do not match')
      return
    }
    try {
      const resp = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      })
      if (resp.data?.token && resp.data?.user) {
        login(resp.data.token, resp.data.user)
        navigate('/')
      } else {
        navigate('/login')
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to register')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-500">Create an HR account</p>
        </div>

        {formError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Jane Doe"
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email', { required: 'Email is required' })}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            {...register('password', { required: 'Password is required', minLength: 8 })}
            error={errors.password?.message}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword', { required: 'Please confirm password' })}
            error={errors.confirmPassword?.message}
          />
          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  )
}
