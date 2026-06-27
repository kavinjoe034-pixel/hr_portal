import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export interface FeedbackData {
  recommendation: 'hire' | 'no-hire' | 'maybe'
  note: string
}

interface FeedbackFormProps {
  interviewId: string
  candidateId: string
  onSuccess?: () => void
}

const addFeedback = async (interviewId: string, data: FeedbackData) => {
  const response = await api.patch(`/interviews/${interviewId}/feedback`, data)
  return response.data
}

export default function FeedbackForm({
  interviewId,
  candidateId,
  onSuccess,
}: FeedbackFormProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackData>()

  const mutation = useMutation({
    mutationFn: (data: FeedbackData) => addFeedback(interviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      reset()
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      aria-label="Interview feedback form"
    >
      <h3 className="text-lg font-semibold text-gray-900">Add feedback</h3>
      <div>
        <label
          htmlFor="recommendation"
          className="text-sm font-medium text-gray-700"
        >
          Recommendation
        </label>
        <select
          id="recommendation"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('recommendation', {
            required: 'Recommendation is required',
          })}
        >
          <option value="">Select recommendation</option>
          <option value="hire">Hire</option>
          <option value="no-hire">No hire</option>
          <option value="maybe">Maybe</option>
        </select>
        {errors.recommendation && (
          <span className="text-xs text-red-600">
            {errors.recommendation.message}
          </span>
        )}
      </div>
      <Input
        label="Note"
        placeholder="Optional feedback note"
        {...register('note')}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save feedback'}
        </Button>
        {mutation.isError && (
          <span className="text-sm text-red-600">
            Failed to save feedback. Please try again.
          </span>
        )}
      </div>
    </form>
  )
}
