import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface JobFormData {
  title: string
  description: string
  skills: string
}

interface JobFormProps {
  onSuccess?: () => void
}

const createJob = async (data: JobFormData) => {
  const payload = {
    title: data.title,
    description: data.description,
    skills: data.skills,
  }
  const response = await api.post('/jobs', payload)
  return response.data
}

export default function JobForm({ onSuccess }: JobFormProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JobFormData>({
    defaultValues: {
      title: '',
      description: '',
      skills: '',
    },
  })

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      reset()
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  const onSubmit = (data: JobFormData) => {
    mutation.mutate(data)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      aria-label="Create job form"
    >
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Create job opening</h2>
      <div className="space-y-4">
        <Input
          label="Title"
          placeholder="e.g. Senior Frontend Engineer"
          error={errors.title?.message}
          {...register('title', { required: 'Title is required' })}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Job description (markdown supported)"
            {...register('description')}
          />
        </div>
        <Input
          label="Skills"
          placeholder="e.g. React, TypeScript, Node.js"
          {...register('skills')}
        />
        <p className="text-xs text-gray-500">Separate skills with commas.</p>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create job'}
        </Button>
        {mutation.isError && (
          <span className="text-sm text-red-600">
            Failed to create job. Please try again.
          </span>
        )}
      </div>
    </form>
  )
}
