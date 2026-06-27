import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export interface ScheduleInterviewData {
  date: string
  time: string
  type: 'Screening' | 'Technical'
  interviewer: string
  notes: string
}

interface ScheduleInterviewFormProps {
  candidateId: string
  onSuccess?: () => void
}

const scheduleInterview = async (
  candidateId: string,
  data: ScheduleInterviewData,
) => {
  const response = await api.post(`/interviews/candidates/${candidateId}`, data)
  return response.data
}

export default function ScheduleInterviewForm({
  candidateId,
  onSuccess,
}: ScheduleInterviewFormProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleInterviewData>()

  const mutation = useMutation({
    mutationFn: (data: ScheduleInterviewData) =>
      scheduleInterview(candidateId, data),
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
      aria-label="Schedule interview form"
    >
      <h3 className="text-lg font-semibold text-gray-900">Schedule interview</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Date"
          type="date"
          error={errors.date?.message}
          {...register('date', { required: 'Date is required' })}
        />
        <Input
          label="Time"
          type="time"
          error={errors.time?.message}
          {...register('time', { required: 'Time is required' })}
        />
      </div>
      <div>
        <label htmlFor="type" className="text-sm font-medium text-gray-700">
          Interview type
        </label>
        <select
          id="type"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('type', { required: 'Type is required' })}
        >
          <option value="">Select type</option>
          <option value="Screening">Screening</option>
          <option value="Technical">Technical</option>
        </select>
        {errors.type && (
          <span className="text-xs text-red-600">{errors.type.message}</span>
        )}
      </div>
      <Input
        label="Interviewer"
        placeholder="e.g. Jane Doe"
        error={errors.interviewer?.message}
        {...register('interviewer', { required: 'Interviewer is required' })}
      />
      <Input
        label="Notes"
        placeholder="Optional notes"
        {...register('notes')}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Scheduling...' : 'Schedule interview'}
        </Button>
        {mutation.isError && (
          <span className="text-sm text-red-600">
            Failed to schedule interview. Please try again.
          </span>
        )}
      </div>
    </form>
  )
}
