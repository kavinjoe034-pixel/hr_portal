import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Copy, Check } from 'lucide-react'

interface Job {
  _id: string
  title: string
  status: string
}

interface AddCandidateFormData {
  name: string
  email: string
  jobId: string
  resume: FileList
}

interface AddCandidateResponse {
  candidate: {
    _id: string
    name: string
    email: string
  }
  magicLink: string
}

interface AddCandidateFormProps {
  onSuccess?: () => void
}

const fetchOpenJobs = async (): Promise<Job[]> => {
  const response = await api.get('/jobs')
  const jobs: Job[] = response.data
  return jobs.filter((job) => job.status === 'Open')
}

const createCandidate = async (data: AddCandidateFormData): Promise<AddCandidateResponse> => {
  const formData = new FormData()
  formData.append('name', data.name)
  formData.append('email', data.email)
  formData.append('jobId', data.jobId)
  formData.append('resume', data.resume[0])

  const response = await api.post('/candidates', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export default function AddCandidateForm({ onSuccess }: AddCandidateFormProps) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddCandidateFormData>()

  const { data: jobs = [], isLoading: isJobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchOpenJobs,
  })

  const mutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  const onSubmit = (data: AddCandidateFormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        reset()
      },
    })
  }

  const handleCopy = async () => {
    if (!mutation.data?.magicLink) return
    await navigator.clipboard.writeText(mutation.data.magicLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isSubmitting = mutation.isPending

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      aria-label="Add candidate form"
    >
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Add candidate</h2>
      <div className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g. Jane Doe"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required' })}
        />
        <Input
          label="Email"
          type="email"
          placeholder="e.g. jane@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address',
            },
          })}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="jobId" className="text-sm font-medium text-gray-700">
            Job opening
          </label>
          <select
            id="jobId"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isJobsLoading}
            {...register('jobId', { required: 'Job opening is required' })}
          >
            <option value="">{isJobsLoading ? 'Loading jobs...' : 'Select a job'}</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
          {errors.jobId && <span className="text-xs text-red-600">{errors.jobId.message}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="resume" className="text-sm font-medium text-gray-700">
            Resume (PDF, max 10 MB)
          </label>
          <input
            id="resume"
            type="file"
            accept=".pdf,application/pdf"
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-600 hover:file:bg-blue-100"
            {...register('resume', {
              required: 'Resume is required',
              validate: {
                isPdf: (files: FileList) => {
                  if (!files || files.length === 0) return true
                  const file = files[0]
                  return (
                    file.type === 'application/pdf' ||
                    file.name.toLowerCase().endsWith('.pdf') ||
                    'Resume must be a PDF file'
                  )
                },
                maxSize: (files: FileList) => {
                  if (!files || files.length === 0) return true
                  const file = files[0]
                  const maxSize = 10 * 1024 * 1024
                  return file.size <= maxSize || 'Resume must be 10 MB or smaller'
                },
              },
            })}
          />
          {errors.resume && <span className="text-xs text-red-600">{errors.resume.message}</span>}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding candidate...' : 'Add candidate'}
        </Button>
        {mutation.isError && (
          <span className="text-sm text-red-600">
            Failed to add candidate. Please try again.
          </span>
        )}
      </div>
      {mutation.isSuccess && mutation.data.magicLink && (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-800">
            Candidate added successfully. Share this magic link:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={mutation.data.magicLink}
              className="flex-1 rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
              data-testid="magic-link-field"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
