import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type ApplyForm = {
  phone: string
  location: string
  currentRole: string
  noticePeriod: string
  salaryExpectation: string
  linkedInUrl: string
}

type ValidationState =
  | { status: 'loading' }
  | { status: 'invalid'; message: string }
  | { status: 'valid'; name: string }

export default function Apply() {
  const { token } = useParams<{ token: string }>()
  const [validation, setValidation] = useState<ValidationState>({ status: 'loading' })
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplyForm>()

  useEffect(() => {
    if (!token) {
      setValidation({ status: 'invalid', message: 'This link is invalid or has expired.' })
      return
    }

    let cancelled = false

    const validate = async () => {
      try {
        const response = await api.get(`/apply/${token}`)
        if (!cancelled) {
          if (response.data.valid) {
            setValidation({ status: 'valid', name: response.data.candidate.name })
          } else {
            setValidation({ status: 'invalid', message: 'This link is invalid or has expired.' })
          }
        }
      } catch (error) {
        if (!cancelled) {
          setValidation({ status: 'invalid', message: 'This link is invalid or has expired.' })
        }
      }
    }

    validate()

    return () => {
      cancelled = true
    }
  }, [token])

  const onSubmit = async (data: ApplyForm) => {
    if (!token) return

    setSubmitStatus('submitting')
    setSubmitError('')

    try {
      await api.post(`/apply/${token}`, data)
      setSubmitStatus('success')
    } catch {
      setSubmitStatus('error')
      setSubmitError('Something went wrong while submitting the form. Please try again.')
    }
  }

  if (validation.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">Verifying your link...</p>
        </div>
      </div>
    )
  }

  if (validation.status === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-md">
          <h1 className="text-xl font-semibold text-gray-900">Link unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{validation.message}</p>
          <p className="mt-4 text-xs text-gray-500">
            If you believe this is a mistake, please contact the hiring team.
          </p>
        </div>
      </div>
    )
  }

  if (submitStatus === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Application submitted</h1>
          <p className="mt-2 text-sm text-gray-600">
            Thanks, {validation.name}. Your details have been received and the hiring team will be
            in touch soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Complete your application</h1>
          <p className="mt-1 text-sm text-gray-500">Hi, {validation.name}. Please fill in the details below.</p>
        </div>

        {submitStatus === 'error' && (
          <div className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{submitError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Phone number"
            type="tel"
            autoComplete="tel"
            {...register('phone', { required: 'Phone number is required' })}
            error={errors.phone?.message}
          />
          <Input
            label="Location"
            autoComplete="address-level2"
            {...register('location', { required: 'Location is required' })}
            error={errors.location?.message}
          />
          <Input
            label="Current role"
            autoComplete="organization-title"
            {...register('currentRole', { required: 'Current role is required' })}
            error={errors.currentRole?.message}
          />
          <Input
            label="Notice period"
            placeholder="e.g. 2 weeks"
            {...register('noticePeriod', { required: 'Notice period is required' })}
            error={errors.noticePeriod?.message}
          />
          <Input
            label="Salary expectation"
            placeholder="e.g. 120000 USD"
            {...register('salaryExpectation', { required: 'Salary expectation is required' })}
            error={errors.salaryExpectation?.message}
          />
          <Input
            label="LinkedIn URL"
            type="url"
            autoComplete="url"
            placeholder="https://linkedin.com/in/yourprofile"
            {...register('linkedInUrl')}
            error={errors.linkedInUrl?.message}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit application'}
          </Button>
        </form>
      </div>
    </div>
  )
}
